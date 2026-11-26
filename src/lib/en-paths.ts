// Angielskie adresy stron (lenslie.com/en/pricing → strona /cennik w wersji angielskiej).
// Bez zależności serwerowych – używane w middleware, w metadanych i w przełączniku języka.

const SEGMENTS: Record<string, string> = {
  cennik: "pricing",
  funkcje: "features",
  rejestracja: "sign-up",
  logowanie: "login",
  regulamin: "terms",
  "polityka-prywatnosci": "privacy",
  "alternatywa-pixieset": "pixieset-alternative",
  "znajdz-siebie": "find-yourself",
  poradnik: "guides",
  przypomnienie: "reminder",
  haslo: "password",
  // podstrony funkcji
  "projektor-albumow": "album-designer",
  "druk-albumow": "album-printing",
  "wtyczka-lightroom": "lightroom-plugin",
  "aplikacja-na-komputer": "desktop-app",
  "zdjecia-od-gosci": "guest-uploads",
  "sprzedaz-zdjec": "photo-sales",
  "strona-portfolio": "portfolio-website",
  "rezerwacje-sesji": "session-booking",
  "filmy-w-galerii": "gallery-videos",
  "motywy-galerii": "gallery-themes",
  "wlasna-domena": "custom-domain",
  // poradniki
  "jak-przekazac-zdjecia-klientowi": "how-to-deliver-photos-to-clients",
};
const BACK: Record<string, string> = Object.fromEntries(Object.entries(SEGMENTS).map(([pl, en]) => [en, pl]));

// Strony serwisu, na które anglojęzyczny gość jest przenoszony pod adres /en/… (pierwszy człon adresu)
const SITE_ROOTS = new Set(["", "cennik", "funkcje", "rejestracja", "logowanie", "regulamin", "polityka-prywatnosci", "alternatywa-pixieset", "znajdz-siebie", "poradnik"]);

const split = (path: string) => path.replace(/\/+$/, "").split("/").filter(Boolean);

// Czy to strona informacyjna Lenslie (nie panel, nie galeria klienta, nie API)
export function isSitePath(path: string) {
  const first = split(path)[0] ?? "";
  return SITE_ROOTS.has(first);
}

// /cennik → /en/pricing, /funkcje/sprzedaz-zdjec → /en/features/photo-sales, / → /en
export function toEn(path: string) {
  const parts = split(path).map((p) => SEGMENTS[p] ?? p);
  return parts.length ? `/en/${parts.join("/")}` : "/en";
}

// /en/pricing → /cennik (adres strony w aplikacji)
export function fromEn(path: string) {
  const parts = split(path);
  if (parts[0] === "en") parts.shift();
  return `/${parts.map((p) => BACK[p] ?? p).join("/")}`;
}

// Kanoniczny adres i wersje językowe dla Google
export function langAlternates(plPath: string, lang: "pl" | "en") {
  const en = toEn(plPath);
  return { canonical: lang === "en" ? en : plPath, languages: { pl: plPath, en, "x-default": plPath } };
}
