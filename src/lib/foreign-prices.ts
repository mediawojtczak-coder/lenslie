// Ceny na angielskiej stronie w walucie kraju klienta (płatność przez Stripe).
// Plik bez zależności serwerowych – używany i w panelu, i przy tworzeniu płatności, żeby kwoty się zgadzały.
import type { Period, PlanId } from "@/lib/plans";
import type { ProTierId } from "@/lib/pro-plans";

export type Cur = "eur" | "usd" | "gbp";
export const CURS: Cur[] = ["eur", "usd", "gbp"];
export const isCur = (c: unknown): c is Cur => c === "eur" || c === "usd" || c === "gbp";

// Waluta według kraju (nagłówek x-vercel-ip-country)
export function curForCountry(country: string | null | undefined): Cur {
  const c = (country ?? "").toUpperCase();
  if (c === "GB" || c === "GG" || c === "JE" || c === "IM") return "gbp";
  if (c === "US" || c === "PR") return "usd";
  return "eur";
}

// Ceny bazowe w euro (zatwierdzone 25.11.2026). USD – te same liczby, GBP – ok. 15% mniej.
const GALLERY_EUR: Record<PlanId, Record<Period, number>> = {
  mala: { 1: 2, 3: 3, 6: 4, 12: 5 },
  srednia: { 1: 3, 3: 4, 6: 5, 12: 7 },
  duza: { 1: 4, 3: 6, 6: 8, 12: 10 },
};
const PRO_EUR: Record<ProTierId, number> = { pro500: 15, pro700: 19, pro1000: 25, pro2000: 45, film30: 32, film60: 62 };
export const ADDON_EUR = {
  guests: 25, // wydarzenie „zdjęcia od gości”
  theme: 5, // motyw galerii
  domain: 25, // własna domena na rok
  faces: 2, // „Znajdź siebie” w galerii
  album: 10, // projektor albumów – miesiąc
  portfolio: 6, // strona portfolio – miesiąc
} as const;
// Rok = 10 miesięcy (2 miesiące gratis)
const YEAR_MONTHS = 10;

// Przybliżone kursy – do kwot bez własnej ceny (np. wydruki) i do przeliczeń w statystykach
export const PLN_PER: Record<Cur, number> = { eur: 4.47, usd: 4.07, gbp: 5.34 }; // kursy z 25.11.2026

const half = (n: number) => Math.max(1, Math.round(n * 2) / 2);
// Kwota z cennika w euro → w walucie klienta
export function fromEur(eur: number, cur: Cur) {
  if (eur <= 0) return 0;
  if (cur === "gbp") return half(eur * 0.85);
  return eur;
}
// Kwota w złotych bez własnej ceny → w walucie klienta (w górę do 0,50)
export function fromPln(pln: number, cur: Cur) {
  if (pln <= 0) return 0;
  return Math.max(1, Math.ceil((pln / PLN_PER[cur]) * 2) / 2);
}
export const toPln = (amount: number, cur: Cur) => Math.round(amount * PLN_PER[cur] * 100) / 100;

export const galleryPriceF = (plan: PlanId, period: Period, cur: Cur) => fromEur(GALLERY_EUR[plan]?.[period] ?? 0, cur);
export function galleryUpgradeF(from: PlanId, to: PlanId, period: Period, cur: Cur) {
  return Math.max(0, galleryPriceF(to, period, cur) - galleryPriceF(from, period, cur));
}
export const proPriceF = (tier: ProTierId, months: number, cur: Cur) =>
  fromEur((PRO_EUR[tier] ?? 0) * (months === 12 ? YEAR_MONTHS : 1), cur);
// Dopłata do większego Pro: kwota w zł przeliczona według stosunku cen nowego pakietu
export function proUpgradeF(tier: ProTierId, plnAmount: number, plnMonthly: number, cur: Cur) {
  const ratio = (PRO_EUR[tier] ?? 0) / (plnMonthly || 1);
  return Math.max(1, Math.ceil(fromEur(plnAmount * ratio, cur) * 2) / 2);
}
export const addonPriceF = (kind: keyof typeof ADDON_EUR, cur: Cur, months = 1) =>
  fromEur(ADDON_EUR[kind] * (months === 12 ? YEAR_MONTHS : months), cur);

// „€5”, „$5.50”, „£4.50”
export function fmtCur(n: number, cur: Cur) {
  const sym = cur === "eur" ? "€" : cur === "usd" ? "$" : "£";
  const whole = Math.abs(n - Math.round(n)) < 0.001;
  return `${sym}${n.toLocaleString("en-GB", whole ? { maximumFractionDigits: 0 } : { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
