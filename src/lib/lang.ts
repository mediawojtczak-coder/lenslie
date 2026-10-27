// Język serwisu (strona, panel, maile). Galerie klientów mają własny język ustawiany przez fotografa.
export type SiteLang = "pl" | "en";
export const LANG_COOKIE = "lenslie_lang";

export const isSiteLang = (v: unknown): v is SiteLang => v === "pl" || v === "en";

// Wybór tekstu: tr(lang, "polski", "English")
export const tr = (lang: SiteLang, pl: string, en: string) => (lang === "en" ? en : pl);

// Kwota w złotych: „8 zł” / „PLN 8”
export function money(n: number, lang: SiteLang, decimals = false) {
  const opts = decimals ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : { maximumFractionDigits: 2 };
  return lang === "en" ? `PLN ${n.toLocaleString("en-GB", opts)}` : `${n.toLocaleString("pl-PL", opts)} zł`;
}

export const locale = (lang: SiteLang) => (lang === "en" ? "en-GB" : "pl-PL");
