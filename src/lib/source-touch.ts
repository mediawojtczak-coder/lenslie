// Skąd przyszedł nowy fotograf: ciasteczko sesyjne z pierwszej strony wizyty (middleware) → zapis przy rejestracji
export const SRC_COOKIE = "ll_src";

export type Touch = { s?: string; m?: string; c?: string; g?: 1; f?: 1; r?: string; l?: string };


const cut = (v: string | null | undefined, n = 60) => (v ? v.trim().slice(0, n) : undefined);

// Wizyta z reklamy / linku / innej strony; null = wejście bez źródła (nie nadpisuje poprzedniego)
export function touchFrom(url: URL, referer: string | null): Touch | null {
  const p = url.searchParams;
  let r: string | undefined;
  try {
    const h = referer ? new URL(referer).hostname.replace(/^www\./, "") : "";
    if (h && !/(^|\.)lenslie\.com$/.test(h) && !h.endsWith(".vercel.app")) r = cut(h, 80);
  } catch {}
  const t: Touch = {
    s: cut(p.get("utm_source")),
    m: cut(p.get("utm_medium")),
    c: cut(p.get("utm_campaign"), 80),
    g: p.get("gclid") || p.get("gbraid") || p.get("wbraid") ? 1 : undefined,
    f: p.get("fbclid") ? 1 : undefined,
    r,
    l: cut(url.pathname, 80),
  };
  return t.s || t.g || t.f || t.r ? t : null;
}

export function readTouch(raw: string | undefined): Touch | null {
  if (!raw) return null;
  try {
    const t = JSON.parse(decodeURIComponent(raw)) as Touch;
    return t && typeof t === "object" ? t : null;
  } catch {
    return null;
  }
}

export function sourceLabel(t: Touch | null, ref?: string | null): string {
  if (ref) return "Polecenie";
  if (!t) return "Bezpośrednio";
  const s = (t.s ?? "").toLowerCase();
  const r = t.r ?? "";
  if (t.g || (s === "google" && /cpc|paid|ads/.test(t.m ?? ""))) return "Reklama Google";
  if (t.f || /facebook|instagram|fb|ig|meta/.test(s)) return /cpc|paid|ads/.test(t.m ?? "") ? "Reklama Facebook / Instagram" : "Facebook / Instagram";
  if (s) return t.s!;
  if (/(^|\.)google\./.test(r)) return "Google (wyszukiwanie)";
  if (/bing\.|duckduckgo|yahoo|ecosia/.test(r)) return "Wyszukiwarka";
  if (/facebook|instagram|fb\.|messenger/.test(r)) return "Facebook / Instagram";
  if (/chatgpt|openai|perplexity|claude\.ai|gemini/.test(r)) return "Asystent AI";
  return r || "Bezpośrednio";
}
