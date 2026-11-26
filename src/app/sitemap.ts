import type { MetadataRoute } from "next";
import { FEATURES } from "@/lib/features";
import { GUIDES } from "@/lib/guides";
import { toEn } from "@/lib/en-paths";

const SITE = "https://www.lenslie.com";

// Mapa strony dla Google: strony Lenslie i strony funkcji
// (bez lastModified – wcześniej była to data wygenerowania mapy, przez co Google uznaje ją za niewiarygodną)
// Każda strona ma też wersję angielską pod /en/… (np. /cennik → /en/pricing)
export default function sitemap(): MetadataRoute.Sitemap {
  const pl: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/cennik`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE}/alternatywa-pixieset`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE}/poradnik`, changeFrequency: "weekly", priority: 0.7 },
    ...GUIDES.map((g) => ({ url: `${SITE}/poradnik/${g.slug}`, changeFrequency: "monthly" as const, priority: 0.7 })),
    { url: `${SITE}/znajdz-siebie`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/przypomnienie`, changeFrequency: "monthly", priority: 0.6 },
    ...FEATURES.map((f) => ({ url: `${SITE}/funkcje/${f.slug}`, changeFrequency: "monthly" as const, priority: 0.7 })),
    { url: `${SITE}/rejestracja`, changeFrequency: "yearly", priority: 0.6 },
    { url: `${SITE}/regulamin`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE}/polityka-prywatnosci`, changeFrequency: "yearly", priority: 0.2 },
  ];
  const withLangs = (e: MetadataRoute.Sitemap[number]) => {
    const path = e.url.slice(SITE.length) || "/";
    return { ...e, alternates: { languages: { pl: `${SITE}${path}`, en: `${SITE}${toEn(path)}` } } };
  };
  return [
    ...pl.map(withLangs),
    ...pl.map((e) => {
      const path = e.url.slice(SITE.length) || "/";
      return { ...withLangs(e), url: `${SITE}${toEn(path)}`, priority: Math.max(0.1, (e.priority ?? 0.5) - 0.1) };
    }),
  ];
}
