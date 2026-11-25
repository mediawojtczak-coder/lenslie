import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { isValidGalleryId } from "@/lib/r2";
import { getMeta, hasAccess, accessCookieName, isExpired } from "@/lib/galleries";
import { getSelection, selectionCookie } from "@/lib/selections";
import { getSaleOrder, saveSaleOrder } from "@/lib/sales";
import { cardSales, salesFee } from "@/lib/stripe-connect";
import { createCheckout } from "@/lib/stripe";

export const runtime = "nodejs";

// Klient galerii płaci kartą za dodatkowe zdjęcia (Stripe Checkout, pieniądze trafiają do fotografa)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidGalleryId(id)) return NextResponse.json({ error: "Invalid gallery." }, { status: 400 });
  const meta = await getMeta(id);
  const store = await cookies();
  if (!meta || isExpired(meta) || !hasAccess(id, meta, store.get(accessCookieName(id))?.value)) {
    return NextResponse.json({ error: "No access to this gallery." }, { status: 403 });
  }
  const sel = await getSelection(id, store.get(selectionCookie(id))?.value);
  if (!sel) return NextResponse.json({ error: "Your selection has expired. Please refresh the page." }, { status: 404 });
  const order = await getSaleOrder(id, sel.id);
  if (!order || order.status !== "ordered" || order.total <= 0 || !order.cur) {
    return NextResponse.json({ error: "There is nothing to pay for this order." }, { status: 400 });
  }
  const card = await cardSales(id, meta);
  if (!card) return NextResponse.json({ error: "Card payments are not available in this gallery." }, { status: 400 });

  const origin = new URL(req.url).origin;
  const body = ((await req.json().catch(() => null)) ?? {}) as { back?: string };
  const back = typeof body.back === "string" && body.back.startsWith(`${origin}/`) ? body.back.split("#")[0] : `${origin}/galeria/${id}`;
  const amount = Math.round(order.total * 100);
  if (amount < 50) return NextResponse.json({ error: "The amount is too small for a card payment." }, { status: 400 });
  const sid = `sale-${Date.now().toString(36)}-${randomBytes(6).toString("hex")}`;
  try {
    const q = new URLSearchParams({ g: id, s: sel.id, back });
    const session = await createCheckout({
      sid,
      amount,
      cur: order.cur,
      name: `${order.extra} extra photo${order.extra === 1 ? "" : "s"} – ${meta.title}`.slice(0, 200),
      email: order.clientEmail ?? "",
      successUrl: `${origin}/api/platnosci/stripe?${q.toString()}`,
      cancelUrl: back,
      connect: { account: card.account, fee: salesFee(amount) },
      metadata: { kind: "sale", gallery: id, selection: sel.id },
    });
    if (!session.url) throw new Error("no url");
    order.stripeSession = session.id;
    await saveSaleOrder(id, order);
    return NextResponse.json({ ok: true, redirect: session.url });
  } catch (e) {
    console.error("Stripe sprzedaż:", e);
    return NextResponse.json({ error: "Could not start the payment. Please try again in a moment." }, { status: 502 });
  }
}
