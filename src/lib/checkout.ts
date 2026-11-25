import { registerTransaction, saveOrder, type Order } from "@/lib/p24";
import { stripeCurrency, createCheckout } from "@/lib/stripe";
import { getMeta } from "@/lib/galleries";
import { getPlan, isPeriod } from "@/lib/plans";
import { proTier } from "@/lib/pro-plans";
import { getTheme } from "@/lib/themes";
import {
  galleryPriceF,
  galleryUpgradeF,
  proPriceF,
  proUpgradeF,
  addonPriceF,
  fromPln,
  toPln,
  type Cur,
} from "@/lib/foreign-prices";

// Kwota w walucie klienta dla zamówienia (null – tego nie sprzedajemy przez Stripe, np. doładowanie salda w zł)
export async function foreignAmount(order: Order, cur: Cur): Promise<number | null> {
  const a = order.action;
  const pln = order.amount / 100;
  if (a.action === "topup") return null;
  if (a.action === "choose") return galleryPriceF(a.plan, a.period, cur);
  if (a.action === "upgrade" || a.action === "extend") {
    const meta = await getMeta(order.galleryId);
    const current = getPlan(meta?.plan);
    if (!meta || !current) return fromPln(pln, cur);
    if (a.action === "extend") return galleryPriceF(current.id, a.period, cur);
    return isPeriod(meta.period) ? galleryUpgradeF(current.id, a.plan, meta.period, cur) || fromPln(pln, cur) : fromPln(pln, cur);
  }
  if (a.action === "guest-event") return addonPriceF("guests", cur);
  if (a.action === "videos") return fromPln(pln, cur);
  if (a.action === "product") {
    if (a.product === "theme") return getTheme(a.theme).price > 0 ? addonPriceF("theme", cur) : 0;
    if (a.product === "faces") return addonPriceF("faces", cur);
    if (a.product === "album") return addonPriceF("album", cur, a.months);
    if (a.product === "portfolio") return addonPriceF("portfolio", cur, a.months);
    if (a.product === "pro") {
      const t = proTier(a.tier);
      if (!t) return null;
      return a.upgrade ? proUpgradeF(t.id, pln, t.monthly, cur) : proPriceF(t.id, a.months, cur);
    }
    return fromPln(pln, cur); // wydruki
  }
  return fromPln(pln, cur);
}

// Rozpoczęcie płatności online: Stripe (angielska wersja, waluta kraju) albo Przelewy24 (złotówki).
// Zwraca adres strony płatności.
export async function startPayment(order: Order, origin: string, lang?: "pl" | "en"): Promise<string> {
  const cur = await stripeCurrency(order.email, lang);
  if (cur) {
    const amount = await foreignAmount(order, cur);
    if (amount && amount > 0) {
      const back = order.returnPath ?? `/panel/galeria/${order.galleryId}`;
      const session = await createCheckout({
        sid: order.sessionId,
        amount: Math.round(amount * 100),
        cur,
        name: order.description.replace(/^Lenslie - /, "Lenslie – "),
        email: order.email,
        successUrl: `${origin}/api/platnosci/stripe?sid=${order.sessionId}`,
        cancelUrl: `${origin}${back}`,
      });
      if (!session.url) throw new Error("Bramka płatności nie przyjęła zamówienia. Spróbuj za chwilę.");
      await saveOrder({
        ...order,
        gateway: "stripe",
        foreign: { cur, amount },
        amount: Math.round(toPln(amount, cur) * 100),
        stripeSession: session.id,
      });
      return session.url;
    }
  }
  return registerTransaction(order, origin, lang);
}
