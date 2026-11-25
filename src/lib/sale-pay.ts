import { getMeta } from "@/lib/galleries";
import { getSaleOrder, saveSaleOrder } from "@/lib/sales";
import { mailDelivered, cash } from "@/lib/sales-mail";
import { claimOnce } from "@/lib/r2-light";
import { getOwnerContact } from "@/lib/profiles";
import { sendEmail, emailLayout, siteUrl } from "@/lib/email";
import type { StripeSession } from "@/lib/stripe";

// Klient zapłacił kartą za dodatkowe zdjęcia: zamówienie od razu opłacone i udostępnione (bez znaku wodnego)
export async function confirmSale(galleryId: string, selection: string, s: StripeSession) {
  const order = await getSaleOrder(galleryId, selection);
  if (!order || order.status !== "ordered" || !order.cur) return;
  const ok =
    order.stripeSession === s.id &&
    s.payment_status === "paid" &&
    s.currency === order.cur &&
    s.amount_total === Math.round(order.total * 100);
  if (!ok) {
    if (s.payment_status === "paid") console.error("Stripe sprzedaż: płatność nie zgadza się z zamówieniem", galleryId, selection, s.id);
    return;
  }
  if (!(await claimOnce(`sales-paid/${galleryId}/${s.id}`))) return;
  const now = new Date().toISOString();
  order.status = "delivered";
  order.paidAt = now;
  order.deliveredAt = now;
  order.paidBy = "card";
  await saveSaleOrder(galleryId, order);

  const meta = await getMeta(galleryId);
  const title = meta?.title ?? "";
  await mailDelivered(galleryId, title, order, meta?.lang ?? "en");
  const owner = await getOwnerContact(galleryId).catch(() => null);
  if (owner) {
    const en = owner.lang === "en";
    await sendEmail({
      to: owner.email,
      subject: en
        ? `Paid by card: ${order.clientName} – ${cash(order.total, "en", order.cur)}`
        : `Opłacone kartą: ${order.clientName} – ${cash(order.total, "pl", order.cur)}`,
      html: emailLayout(
        en ? "Your client paid for extra photos" : "Klient zapłacił za dodatkowe zdjęcia",
        en
          ? [
              `${order.clientName} paid ${cash(order.total, "en", order.cur)} by card for ${order.extra} extra photos from “${title}” (order ${order.ref}).`,
              "The photos have been unlocked for your client automatically. The money goes to your Stripe account and is paid out to your bank.",
            ]
          : [
              `${order.clientName} zapłacił(a) kartą ${cash(order.total, "pl", order.cur)} za ${order.extra} dodatkowych zdjęć z galerii „${title}” (zamówienie ${order.ref}).`,
              "Zdjęcia zostały automatycznie udostępnione klientowi. Pieniądze trafiają na Twoje konto Stripe i są wypłacane na Twoje konto bankowe.",
            ],
        { label: en ? "See the order" : "Zobacz zamówienie", url: `${siteUrl()}/panel/galeria/${galleryId}?tab=wybory` },
        owner.lang,
      ),
    }).catch(() => undefined);
  }
}
