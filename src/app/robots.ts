import type { MetadataRoute } from "next";

const SITE = "https://www.lenslie.com";

// Roboty wyszukiwarek: strona Lenslie tak, galerie klientów, panel i API – nie
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/panel", "/admin", "/api/", "/auth/", "/galeria/", "/goscie/", "/rezerwacja/", "/domena/", "/haslo"],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
