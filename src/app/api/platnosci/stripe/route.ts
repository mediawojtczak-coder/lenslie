import { NextResponse } from "next/server";
import { getOrder, type Order } from "@/lib/p24";
import { getCheckout, webhookValid, type StripeSession } from "@/lib/stripe";
import { fulfilOrder } from "@/lib/fulfil-order";
import { siteUrl } from "@/lib/email";

export const runtime = "nodejs";

// Czy sesja Stripe naprawdę dotyczy tego zamówienia i jest opłacona w całości
function matches(order: Order, s: StripeSession) {
  return (
    order.gateway === "stripe" &&
    order.stripeSession === s.id &&
    s.payment_status === "paid" &&
    s.currency === order.foreign?.cur &&
    s.amount_total === Math.round((order.foreign?.amount ?? 0) * 100)
  );
}

async function confirm(order: Order, s: StripeSession) {
  if (order.status === "paid") return;
  if (!matches(order, s)) {
    if (s.payment_status === "paid") console.error("Stripe: płatność nie zgadza się z zamówieniem", order.sessionId, s.id, s.amount_total, s.currency);
    return;
  }
  await fulfilOrder(order.sessionId, { gateway: "stripe", ref: s.payment_intent ?? s.id });
}

// Powrót klienta ze strony płatności – sprawdzamy w Stripe i przenosimy z powrotem do panelu
export async function GET(req: Request) {
  const sid = new URL(req.url).searchParams.get("sid") ?? "";
  const order = await getOrder(sid);
  if (!order) return NextResponse.redirect(`${siteUrl()}/panel`);
  if (order.status !== "paid" && order.stripeSession) {
    const s = await getCheckout(order.stripeSession).catch(() => null);
    if (s) await confirm(order, s).catch((e) => console.error("Stripe powrót:", e));
  }
  const back = order.returnPath ?? `/panel/galeria/${order.galleryId}`;
  return NextResponse.redirect(`${siteUrl()}${back}${back.includes("?") ? "&" : "?"}platnosc=${order.sessionId}`);
}

// Powiadomienia od Stripe (webhook)
export async function POST(req: Request) {
  const raw = await req.text();
  if (!webhookValid(raw, req.headers.get("stripe-signature"))) {
    console.error("Stripe: nieprawidłowy podpis powiadomienia");
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const event = JSON.parse(raw) as { type: string; data: { object: StripeSession } };
  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
    return NextResponse.json({ ok: true });
  }
  const s = event.data.object;
  const order = s.client_reference_id ? await getOrder(s.client_reference_id) : null;
  if (!order) return NextResponse.json({ ok: true }); // nie nasze zamówienie
  await confirm(order, s);
  return NextResponse.json({ ok: true });
}
