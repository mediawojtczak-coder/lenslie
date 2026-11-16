import { cache } from "react";
import { getMeta } from "@/lib/galleries";
import { getGalleryBrand } from "@/lib/profiles";

// Galeria klienta: opis galerii i studio fotografa czytamy raz na wyświetlenie strony.
// Wcześniej robił to osobno podgląd linku (generateMetadata) i osobno sama strona – podwójne zapytania do R2 i Supabase.
export const getMetaOnce = cache(getMeta);
export const getGalleryBrandOnce = cache(getGalleryBrand);
