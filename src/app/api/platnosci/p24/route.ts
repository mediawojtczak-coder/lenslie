import { NextResponse } from "next/server";
import { getOrder, saveOrder, notificationValid, verifyTransaction, type Notification } from "@/lib/p24";
import { applyAction } from "@/lib/plan-actions";
import { activateGuestEvent } from "@/lib/guest-events";
import { getMeta, saveMeta } from "@/lib/galleries";
import { startVideos } from "@/lib/videos";
import { fulfillProduct } from "@/lib/products";
import { addEntries } from "@/lib/wallet";
import { referralPayment } from "@/lib/referrals";
import { sendEmail, emailLayout, siteUrl } from "@/lib/email";

export const runtime = "nodejs";

// Powiadomienie od Przelewy24 o opłaconej transakcji
export async function POST(req: Request) {
  const n = (await req.json().catch(() => null)) as Notification | null;
  if (!n || !notificationValid(n)) {
    console.error("P24: nieprawidłowe powiadomienie");
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const order = await getOrder(n.sessionId);
  if (!order) return NextResponse.json({ error: "unknown" }, { status: 404 });
  if (order.status === "paid") return NextResponse.json({ ok: true });
  if (n.amount !== order.amount || n.currency !== "PLN") {
    console.error("P24: kwota się nie zgadza", n.sessionId, n.amount, order.amount);
    return NextResponse.json({ error: "amount" }, { status: 400 });
  }
  if (!(await verifyTransaction(n))) return NextResponse.json({ error: "verify" }, { status: 502 });

  if (order.action.action === "topup") {
    const a = order.action;
    await addEntries(order.ownerId, [
      { type: "topup", amount: a.amount * 100, description: `Doładowanie konta (Przelewy24)`, ref: order.sessionId },
      ...(a.bonus ? [{ type: "bonus" as const, amount: a.bonus * 100, description: `Bonus do doładowania ${a.amount} zł`, ref: order.sessionId }] : []),
    ]);
  } else if (order.action.action === "product") {
    await fulfillProduct(order.action);
  } else if (order.action.action === "videos") {
    const meta = await getMeta(order.action.galleryId);
    if (meta?.videos) {
      await startVideos(meta.videos, order.action.ids);
      await saveMeta(order.action.galleryId, meta);
    }
  } else if (order.action.action === "guest-event") {
    await activateGuestEvent(order.action.eventId);
  } else {
    await applyAction(order.galleryId, order.action);
  }
  await saveOrder({ ...order, status: "paid", paidAt: new Date().toISOString(), orderId: n.orderId });
  await referralPayment(order.ownerId, order.amount).catch((e) => console.error("Polecenia:", e));

  // Mail do administratora: nowa płatność (z danymi do faktury, jeśli klient jej chce)
  const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  const zl = (order.amount / 100).toLocaleString("pl-PL", { minimumFractionDigits: 2 }) + " zł";
  const inv = order.invoice;
  for (const to of admins) {
    await sendEmail({
      to,
      subject: inv ? `Wystaw fakturę: ${zl} – ${inv.company}` : `Nowa płatność Lenslie: ${zl}`,
      html: emailLayout(
        inv ? "Nowa płatność – klient prosi o fakturę" : "Nowa płatność",
        [
          `Kwota: ${zl} (Przelewy24, nr ${n.orderId}).`,
          `Za: ${order.description}.`,
          `Konto: ${order.email}.`,
          ...(inv
            ? [`Faktura na: ${inv.company}, NIP ${inv.nip}, ${inv.street}, ${inv.postcode} ${inv.city}.`, "Fakturę wyślij na adres e-mail konta."]
            : ["Klient nie prosił o fakturę."]),
        ],
        { label: "Płatności w panelu administratora", url: `${siteUrl()}/admin#platnosci` },
      ),
    }).catch(() => undefined);
  }
  return NextResponse.json({ ok: true });
}
