// Cennik wydruku albumów (wspólny dla panelu i serwera).
// Ceny drukarni za fotoalbum 20 stron + 6 zł za kolejną stronę (do 40 stron), marża 100%, wysyłka InPost do paczkomatu.
export const PRINT_BASE: Record<string, number> = { "15x15": 95, "20x20": 110, "25x25": 140 };
export const PRINT_EXTRA_PAGE = 6;
export const PRINT_MARKUP = 2;
export const PRINT_SHIPPING = 15;
export const PRINT_MIN_PAGES = 20;
export const PRINT_MAX_PAGES = 40;
export const PRINT_FORMATS = Object.keys(PRINT_BASE);

// Liczba stron do druku (parzysta, co najmniej 20)
export function printPages(spreads: number) {
  return Math.max(PRINT_MIN_PAGES, spreads * 2);
}

export function printPrice(format: string, pages: number) {
  const base = PRINT_BASE[format];
  if (!base) return null;
  const p = Math.max(PRINT_MIN_PAGES, pages);
  const album = (base + (p - PRINT_MIN_PAGES) * PRINT_EXTRA_PAGE) * PRINT_MARKUP;
  return { album, shipping: PRINT_SHIPPING, total: album + PRINT_SHIPPING, pages: p };
}
