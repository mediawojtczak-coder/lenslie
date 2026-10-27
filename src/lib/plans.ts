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
export const DEFAULT_PERIOD: Period = 12;

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
