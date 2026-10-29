// Język serwisu (strona, panel, maile). Galerie klientów mają własny język ustawiany przez fotografa.
export type SiteLang = "pl" | "en";
export const LANG_COOKIE = "lenslie_lang";

export const isSiteLang = (v: unknown): v is SiteLang => v === "pl" || v === "en";

// Orientacyjny kurs dolara (płatności są zawsze w złotych) – zaktualizuj przy większej zmianie kursu
export const USD_PLN = 3.9;

// „≈ $6” (powyżej 10 USD bez groszy)
export function usd(pln: number) {
  const v = pln / USD_PLN;
  return `≈ $${v.toLocaleString("en-US", v >= 10 ? { maximumFractionDigits: 0 } : { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// W angielskich tekstach dopisuje do „PLN 25” orientacyjną kwotę w dolarach: „PLN 25 (≈ $6.41)”
export function usdify(text: string) {
  return text.replace(/PLN (\d+(?:,\d{3})*(?:\.\d+)?)(?!\d|[.,]\d| \(≈)/g, (m, num: string) => {
    const n = Number(num.replace(/,/g, ""));
    return n > 0 ? `${m} (${usd(n)})` : m;
  });
}

// Wybór tekstu: tr(lang, "polski", "English")
export const tr = (lang: SiteLang, pl: string, en: string) => (lang === "en" ? usdify(en) : pl);

// Kwota w złotych: „8 zł” / „PLN 8 (≈ $2.05)”
export function money(n: number, lang: SiteLang, decimals = false) {
  const opts = decimals ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : { maximumFractionDigits: 2 };
  if (lang !== "en") return `${n.toLocaleString("pl-PL", opts)} zł`;
  return n > 0 ? `PLN ${n.toLocaleString("en-GB", opts)} (${usd(n)})` : `PLN ${n.toLocaleString("en-GB", opts)}`;
}

export const locale = (lang: SiteLang) => (lang === "en" ? "en-GB" : "pl-PL");
