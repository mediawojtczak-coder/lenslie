import type { MetadataRoute } from "next";
import { FEATURES } from "@/lib/features";

const SITE = "https://www.lenslie.com";

// Mapa strony dla Google: strony Lenslie i strony funkcji
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/cennik`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE}/znajdz-siebie`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    ...FEATURES.map((f) => ({ url: `${SITE}/funkcje/${f.slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.7 })),
    { url: `${SITE}/rejestracja`, lastModified: now, changeFrequency: "yearly", priority: 0.6 },
    { url: `${SITE}/regulamin`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE}/polityka-prywatnosci`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
}
