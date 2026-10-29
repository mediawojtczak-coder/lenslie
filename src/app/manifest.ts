import type { MetadataRoute } from "next";

// Lenslie jako aplikacja instalowana z przeglądarki (komputer, telefon, tablet)
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lenslie",
    short_name: "Lenslie",
    description: "Galerie zdjęć dla klientów fotografa",
    id: "/panel",
    start_url: "/panel",
    scope: "/",
    display: "standalone",
    background_color: "#fdfcfa",
    theme_color: "#fdfcfa",
    lang: "pl",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
