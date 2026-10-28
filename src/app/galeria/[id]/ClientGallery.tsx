import { cookies } from "next/headers";
import { getGallerySummary } from "@/lib/photos";
import { isValidGalleryId } from "@/lib/r2";
import { getMeta, hasAccess, accessCookieName, isExpired, type GalleryMeta } from "@/lib/galleries";
import { getGalleryBrand } from "@/lib/profiles";
import { getUser } from "@/lib/supabase/server";
import { T } from "@/lib/i18n";
import { isThemeId, type ThemeId } from "@/lib/themes";
import Hero from "./Hero";
import GalleryView, { formatEventDate } from "./GalleryView";

function titleFromId(id: string) {
  const t = id.replace(/-/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// Galeria widziana przez klienta – używana pod adresem Lenslie i pod własną domeną fotografa
export async function ClientGallery({ id, blad, motyw }: { id: string; blad?: string; motyw?: string }) {
  if (!isValidGalleryId(id)) {
    return <p className="notice">Nie znaleziono galerii.</p>;
  }

  let meta: GalleryMeta | null = null;
  let error = false;
  try {
    meta = await getMeta(id);
  } catch {
    error = true;
  }
  const title = meta?.title || titleFromId(id);
  const t = T[meta?.lang ?? "pl"];

  // Po wygaśnięciu pakietu klient widzi tylko krótką informację
  if (isExpired(meta)) {
    return (
      <section className="expired-page">
        <p className="wordmark">Lenslie</p>
        <h1>{title}</h1>
        <p>{t.expired}</p>
      </section>
    );
  }

  // Wersja robocza: klient jej nie widzi, fotograf może ją podejrzeć
  let preview = false;
  if (meta && !meta.plan) {
    const { supabase, user } = await getUser().catch(() => ({ supabase: null, user: null }));
    const own = user && supabase ? (await supabase.from("galleries").select("id").eq("id", id).maybeSingle()).data : null;
    if (!own) {
      return (
        <section className="expired-page">
          <p className="wordmark">Lenslie</p>
          <h1>{title}</h1>
          <p>{t.notPublished}</p>
        </section>
      );
    }
    preview = true;
  }

  // Galeria chroniona hasłem: bez ważnego ciasteczka pokazujemy tylko okładkę z polem na hasło
  const cookieStore = await cookies();
  if (!error && !preview && !hasAccess(id, meta, cookieStore.get(accessCookieName(id))?.value)) {
    const [summary, brand] = await Promise.all([
      getGallerySummary(id, meta?.cover).catch(() => ({ count: 0, coverUrl: null })),
      getGalleryBrand(id).catch(() => ({ studioName: null, logoUrl: null })),
    ]);
    const th = isThemeId(meta?.theme) ? meta!.theme! : "classic";
    return (
      <div className={`gtheme gtheme-${th}`}>
      <Hero
        id={id}
        title={title}
        subtitle={formatEventDate(meta?.eventDate, meta?.lang)}
        lang={meta?.lang}
        studio={brand.studioName}
        coverUrl={summary.coverUrl}
        locked
        error={Boolean(blad)}
      />
      </div>
    );
  }

  if (error) return <p className="notice">Nie udało się wczytać galerii. Odśwież stronę za chwilę.</p>;

  // Fotograf może podejrzeć galerię w innym motywie (?motyw=noir)
  let themeOverride: ThemeId | undefined;
  if (motyw && isThemeId(motyw)) {
    const { supabase, user } = await getUser().catch(() => ({ supabase: null, user: null }));
    const own = user && supabase ? (await supabase.from("galleries").select("id").eq("id", id).maybeSingle()).data : null;
    if (own) themeOverride = motyw;
  }

  return <GalleryView id={id} meta={meta} title={title} mode="client" preview={preview} themeOverride={themeOverride} />;
}
