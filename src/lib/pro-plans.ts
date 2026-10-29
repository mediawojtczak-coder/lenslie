// Abonamenty Pro dla firm: wspólna pula miejsca na wszystkie galerie i filmy, wszystkie dodatki w cenie.
// Plik bez zależności serwerowych – używany też w cenniku i panelu.

export type ProTierId = "pro500" | "pro700" | "pro1000" | "pro2000" | "film30" | "film60";
// videoHours – limit długości filmów w galeriach (podgląd w Cloudflare Stream kosztuje za każdą minutę)
// film – pakiety dla filmowców (więcej godzin filmów)
export type ProTier = { id: ProTierId; gb: number; videoHours: number; monthly: number; yearly: number; featured?: boolean; film?: boolean };
export type ProMonths = 1 | 12;

export const PRO_TIERS: ProTier[] = [
  // rok = 12 × cena miesięczna (bez rabatu)
  { id: "pro500", gb: 500, videoHours: 10, monthly: 59, yearly: 708 },
  { id: "pro700", gb: 700, videoHours: 15, monthly: 79, yearly: 948, featured: true },
  { id: "pro1000", gb: 1000, videoHours: 20, monthly: 99, yearly: 1188 },
  { id: "pro2000", gb: 2000, videoHours: 40, monthly: 189, yearly: 2268 },
  // dla filmowców
  { id: "film30", gb: 500, videoHours: 30, monthly: 129, yearly: 1548, film: true },
  { id: "film60", gb: 1000, videoHours: 60, monthly: 249, yearly: 2988, film: true },
];

export const PHOTO_TIERS = PRO_TIERS.filter((t) => !t.film);
export const FILM_TIERS = PRO_TIERS.filter((t) => t.film);

// „Większy” pakiet = droższy (zmiana w trakcie okresu z dopłatą różnicy); tańszy – po końcu okresu
export const proIsBigger = (to: ProTier, from: ProTier) => to.monthly > from.monthly;

// Galerie działają jeszcze tyle dni po końcu abonamentu (czas na odnowienie)
export const PRO_GRACE_DAYS = 30;
// Zapas ponad pulę, żeby pojedyncze zdjęcia nie blokowały pracy
export const PRO_TOLERANCE = 0.02;
const GB = 1024 ** 3;
const DAY = 24 * 3600 * 1000;

export function proTier(id: unknown): ProTier | undefined {
  return PRO_TIERS.find((t) => t.id === id);
}

export const proName = (t: ProTier) => (t.film ? `Pro Film ${t.videoHours}` : `Pro ${t.gb >= 1000 ? `${t.gb / 1000} TB` : `${t.gb} GB`}`);
export const proBytes = (t: ProTier) => t.gb * GB;
export const proHardLimit = (t: ProTier) => Math.floor(proBytes(t) * (1 + PRO_TOLERANCE));
export const proVideoSeconds = (t: ProTier) => t.videoHours * 3600;

// „2 h 15 min” / „45 min”
export function fmtDuration(sec: number, lang: "pl" | "en" = "pl") {
  const m = Math.round(sec / 60);
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h ? (r ? `${h} h ${r} min` : `${h} h`) : `${r} min`;
}

export const proPrice = (t: ProTier, months: ProMonths) => (months === 12 ? t.yearly : t.monthly);

// Dopłata za przejście na większy abonament w trakcie okresu: różnica ceny × pozostałe dni
// (przy abonamencie rocznym – według cen rocznych)
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
