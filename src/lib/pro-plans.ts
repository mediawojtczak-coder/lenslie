// Abonamenty Pro dla firm: wspólna pula miejsca na wszystkie galerie i filmy, wszystkie dodatki w cenie.
// Plik bez zależności serwerowych – używany też w cenniku i panelu.

export type ProTierId = "pro500" | "pro700" | "pro1000" | "pro2000";
export type ProTier = { id: ProTierId; gb: number; monthly: number; yearly: number; featured?: boolean };
export type ProMonths = 1 | 12;

export const PRO_TIERS: ProTier[] = [
  { id: "pro500", gb: 500, monthly: 59, yearly: 590 },
  { id: "pro700", gb: 700, monthly: 79, yearly: 790, featured: true },
  { id: "pro1000", gb: 1000, monthly: 99, yearly: 990 },
  { id: "pro2000", gb: 2000, monthly: 189, yearly: 1890 },
];

// Galerie działają jeszcze tyle dni po końcu abonamentu (czas na odnowienie)
export const PRO_GRACE_DAYS = 30;
// Zapas ponad pulę, żeby pojedyncze zdjęcia nie blokowały pracy
export const PRO_TOLERANCE = 0.02;
const GB = 1024 ** 3;
const DAY = 24 * 3600 * 1000;

export function proTier(id: unknown): ProTier | undefined {
  return PRO_TIERS.find((t) => t.id === id);
}

export const proName = (t: ProTier) => `Pro ${t.gb >= 1000 ? `${t.gb / 1000} TB` : `${t.gb} GB`}`;
export const proBytes = (t: ProTier) => t.gb * GB;
export const proHardLimit = (t: ProTier) => Math.floor(proBytes(t) * (1 + PRO_TOLERANCE));
export const proPrice = (t: ProTier, months: ProMonths) => (months === 12 ? t.yearly : t.monthly);

// Dopłata za przejście na większy abonament w trakcie okresu: różnica ceny × pozostałe dni
// (przy abonamencie rocznym – według cen rocznych, czyli z rabatem)
export function proUpgradeCost(from: ProTier, to: ProTier, paidUntil: string, months: ProMonths = 1) {
  const days = Math.max(0, (new Date(paidUntil).getTime() - Date.now()) / DAY);
  const perDay = months === 12 ? (to.yearly - from.yearly) / 365 : (to.monthly - from.monthly) / 30;
  return Math.max(1, Math.ceil(perDay * days));
}

// ===== Porównanie z cenami za pojedyncze galerie i dodatki (cennik) =====
// Przykład: duże galerie ślubne (~15 GB) dostępne przez 12 miesięcy, w cenach pojedynczych publikacji.
export const COMPARE_GALLERY_GB = 15;
export const COMPARE_GALLERY_PRICE = 25; // Duża galeria, 12 miesięcy
export const COMPARE_ADDONS = [
  { pl: "Strona portfolio (rok)", en: "Portfolio website (year)", price: 240 },
  { pl: "Projektor albumów (rok)", en: "Album designer (year)", price: 290 },
  { pl: "Własna domena (rok)", en: "Custom domain (year)", price: 99 },
  { pl: "3 motywy galerii", en: "3 gallery themes", price: 57 },
  { pl: "Znajdź siebie – 5 galerii", en: "Find me – 5 galleries", price: 245 },
  { pl: "Zdjęcia od gości – 2 wydarzenia", en: "Guest uploads – 2 events", price: 198 },
] as const;

export function compareFor(t: ProTier) {
  const galleries = Math.floor(t.gb / COMPARE_GALLERY_GB);
  const galleryCost = galleries * COMPARE_GALLERY_PRICE;
  const addons = COMPARE_ADDONS.reduce((s, a) => s + a.price, 0);
  const separately = galleryCost + addons;
  return { galleries, galleryCost, addons, separately, saving: Math.max(0, separately - t.yearly) };
}
