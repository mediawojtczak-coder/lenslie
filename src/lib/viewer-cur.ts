import { getUser } from "@/lib/supabase/server";
import { stripeCurrency } from "@/lib/stripe";
import { addonPriceF, fmtCur, proPriceF, ADDON_EUR, type Cur } from "@/lib/foreign-prices";
import { money, type SiteLang } from "@/lib/lang";

// Waluta zalogowanego fotografa na stronach panelu (serwer): €/$/£ w wersji angielskiej z kartą, inaczej null (zł)
export async function viewerCur(): Promise<Cur | null> {
  const { user } = await getUser().catch(() => ({ user: null }));
  return user ? stripeCurrency(user.email).catch(() => null) : null;
}

// Cena dodatku do pokazania: w walucie klienta albo w złotych
export const addonLabel = (kind: keyof typeof ADDON_EUR, pln: number, lang: SiteLang, cur: Cur | null, months = 1) =>
  cur ? fmtCur(addonPriceF(kind, cur, months), cur) : money(pln, lang);
export const proFromLabel = (cur: Cur) => fmtCur(proPriceF("pro500", 1, cur), cur);

// Strony publiczne (cennik, strona główna): waluta odwiedzającego, gdy płatności kartą są włączone dla wszystkich;
// zalogowany administrator widzi je już teraz (podgląd przed włączeniem)
export async function siteCur(lang: SiteLang): Promise<Cur | null> {
  if (lang !== "en") return null;
  const { cardModePublic } = await import("@/lib/stripe");
  if (cardModePublic(lang)) {
    const { headers } = await import("next/headers");
    const { curForCountry } = await import("@/lib/foreign-prices");
    return curForCountry((await headers()).get("x-vercel-ip-country"));
  }
  return viewerCur();
}
