// Pakiety galerii – jedno miejsce, z którego korzysta cennik (a później płatności i limity)
export type Period = 1 | 3 | 6 | 12;

export type Plan = {
  id: "mala" | "srednia" | "duza";
  name: string;
  limitGb: number;
  photos: string;
  forWhom: string;
  prices: Record<Period, number>; // zł za galerię
  featured?: boolean;
};

export const PERIODS: Period[] = [1, 3, 6, 12];
export const DEFAULT_PERIOD: Period = 3;

export const PLANS: Plan[] = [
  {
    id: "mala",
    name: "Mała",
    limitGb: 1.5,
    photos: "ok. 200 zdjęć",
    forWhom: "Sesje portretowe, rodzinne i biznesowe",
    prices: { 1: 5, 3: 8, 6: 10, 12: 12 },
  },
  {
    id: "srednia",
    name: "Średnia",
    limitGb: 5,
    photos: "ok. 650 zdjęć",
    forWhom: "Chrzciny, komunie, urodziny, mniejsze wydarzenia",
    prices: { 1: 7, 3: 11, 6: 14, 12: 18 },
    featured: true,
  },
  {
    id: "duza",
    name: "Duża",
    limitGb: 15,
    photos: "ok. 2000 zdjęć",
    forWhom: "Reportaże ślubne i duże wydarzenia",
    prices: { 1: 10, 3: 15, 6: 19, 12: 25 },
  },
];

export function periodLabel(p: Period) {
  if (p === 1) return "1 miesiąc";
  if (p === 3) return "3 miesiące";
  return `${p} miesięcy`;
}

export type PlanId = Plan["id"];

// Zapas ponad limit pakietu, żeby pojedyncze zdjęcia nie blokowały pracy
export const TOLERANCE = 0.02;
const GB = 1024 ** 3;

export function getPlan(id: string | undefined | null): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}

export function isPeriod(n: unknown): n is Period {
  return n === 1 || n === 3 || n === 6 || n === 12;
}

// Limit pakietu w bajtach (bez zapasu) i twardy limit z zapasem
export function planBytes(plan: Plan) {
  return plan.limitGb * GB;
}
export function hardLimitBytes(plan: Plan) {
  return Math.floor(planBytes(plan) * (1 + TOLERANCE));
}

export function addMonths(from: Date, months: number) {
  const d = new Date(from);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0); // np. 31 stycznia + 1 miesiąc = 28/29 lutego
  return d;
}

// Dopłata przy zmianie pakietu na większy w tym samym okresie
export function upgradeCost(from: Plan, to: Plan, period: Period) {
  return Math.max(0, to.prices[period] - from.prices[period]);
}

export function formatBytes(bytes: number) {
  if (bytes >= GB) return `${(bytes / GB).toLocaleString("pl-PL", { maximumFractionDigits: 2 })} GB`;
  return `${Math.max(0, Math.round(bytes / 1024 ** 2)).toLocaleString("pl-PL")} MB`;
}
