import { registerTransaction, saveOrder, type Order } from "@/lib/p24";
import { stripeCurrency, createCheckout } from "@/lib/stripe";
import { getMeta } from "@/lib/galleries";
import { getPlan, isPeriod } from "@/lib/plans";
import { proTier, proName } from "@/lib/pro-plans";
import { getTheme } from "@/lib/themes";
import {
  galleryPriceF,
  clientExtendF,
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
  if (a.action === "topup") return a.cur === cur ? a.amount : null;
  if (a.action === "choose") return galleryPriceF(a.plan, a.period, cur);
  if (a.action === "extend" && order.byClient) return clientExtendF(a.period, cur);
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
    if (a.product === "domain") return addonPriceF("domain", cur);
    if (a.product === "pro") {
      const t = proTier(a.tier);
      if (!t) return null;
      return a.upgrade ? proUpgradeF(t.id, pln, t.monthly, cur) : proPriceF(t.id, a.months, cur);
    }
    return fromPln(pln, cur); // wydruki
  }
  return fromPln(pln, cur);
}

// Nazwa zakupu na stronie płatności Stripe i w potwierdzeniu dla klienta – po angielsku (wersja angielska)
const PLAN_EN: Record<string, string> = { mala: "Small", srednia: "Medium", duza: "Large" };
const months = (n: number) => `${n} month${n === 1 ? "" : "s"}`;
export async function englishName(order: Order): Promise<string> {
  const a = order.action;
  const meta = order.galleryId ? await getMeta(order.galleryId).catch(() => null) : null;
  const title = meta?.title ? ` – ${meta.title}` : "";
  switch (a.action) {
    case "choose":
      return `Gallery – ${PLAN_EN[a.plan] ?? a.plan}, ${months(a.period)}${title}`;
    case "upgrade":
      return `Gallery upgrade to ${PLAN_EN[a.plan] ?? a.plan}${title}`;
    case "extend":
      return `Gallery extension – ${months(a.period)}${title}`;
    case "topup":
      return `Lenslie balance top-up – ${a.amount}${a.bonus ? ` (+${a.bonus} bonus)` : ""}`;
    case "guest-event":
      return "Guest uploads – one event";
    case "videos":
      return `Videos in the gallery${title}`;
    case "product": {
      if (a.product === "theme") return `Gallery theme – ${getTheme(a.theme).nameEn}`;
      if (a.product === "faces") return "Find yourself – face search in the gallery";
      if (a.product === "album") return `Album designer – ${a.months === 12 ? "12 months" : months(a.months)}`;
      if (a.product === "portfolio") return `Portfolio website – ${a.months === 12 ? "12 months" : months(a.months)}`;
      if (a.product === "domain") return `Custom domain ${a.host} – ${a.renew ? "renewal, " : ""}12 months`;
      if (a.product === "pro") {
        const t = proTier(a.tier);
        const n = t ? proName(t) : "Pro";
        return a.upgrade ? `Upgrade to Lenslie ${n}` : `Lenslie ${n} – ${a.months === 12 ? "12 months" : months(a.months)}`;
      }
      return "Lenslie order";
    }
    default:
      return "Lenslie";
  }
}

// Rozpoczęcie płatności online: Stripe (angielska wersja, waluta kraju) albo Przelewy24 (złotówki).
// Zwraca adres strony płatności.
// gateEmail – czyje konto decyduje o płatności kartą (np. fotograf, gdy płaci jego klient)
export async function startPayment(order: Order, origin: string, lang?: "pl" | "en", gateEmail?: string | null): Promise<string> {
  const cur = await stripeCurrency(gateEmail ?? order.email, lang);
  if (cur) {
    const amount = await foreignAmount(order, cur);
    if (amount && amount > 0) {
      const back = order.returnPath ?? `/panel/galeria/${order.galleryId}`;
      const session = await createCheckout({
        sid: order.sessionId,
        amount: Math.round(amount * 100),
        cur,
        name: await englishName(order).catch(() => "Lenslie"),
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
