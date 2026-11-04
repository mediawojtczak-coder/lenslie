import type { Metadata } from "next";
import { adminClient } from "@/lib/supabase/admin";
import { getMeta } from "@/lib/galleries";
import { getGalleryBrand } from "@/lib/profiles";

// Podgląd linku do galerii (Instagram, Messenger, WhatsApp, Facebook, SMS):
// miniatura = okładka galerii, tytuł = „Nazwa studia – Lenslie.com”, opis = nazwa galerii
export async function galleryShareMeta(id: string, origin: string): Promise<Metadata> {
  const db = adminClient();
  const [meta, brand, row] = await Promise.all([
    getMeta(id).catch(() => null),
    getGalleryBrand(id).catch(() => ({ studioName: null, logoUrl: null })),
    db ? db.from("galleries").select("title").eq("id", id).maybeSingle().then((r) => r.data as { title?: string } | null) : Promise.resolve(null),
  ]);
  const galleryTitle = row?.title?.trim() || "Galeria zdjęć";
  const studio = brand.studioName?.trim();
  const title = `${studio || galleryTitle} – Lenslie.com`;
  const description = studio ? galleryTitle : "Galeria zdjęć online";
  // wersja w adresie, żeby po zmianie okładki serwisy pobrały nową miniaturę
  const v = encodeURIComponent(meta?.coverFile ?? meta?.cover ?? "1");
  const image = `${origin}/galeria/${id}/okladka.jpg?v=${v}`;
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      url: origin.includes("lenslie.com") || origin.includes("localhost") ? `${origin}/galeria/${id}` : `${origin}/${id}`,
      siteName: studio || "Lenslie",
      type: "website",
      images: [{ url: image, alt: galleryTitle }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}
