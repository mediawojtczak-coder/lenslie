import { cookies } from "next/headers";
import { getGallerySummary } from "@/lib/photos";
import { getGalleryBrand } from "@/lib/profiles";
import { isValidGalleryId } from "@/lib/r2";
import { getMeta, hasAccess, accessCookieName, isExpired, type GalleryMeta } from "@/lib/galleries";
import Hero from "./Hero";
import GalleryView, { formatEventDate } from "./GalleryView";

export const dynamic = "force-dynamic";

// Galerie są prywatne – nie pokazujemy ich w wyszukiwarkach
export const metadata = { robots: { index: false, follow: false } };

const proporcje = ["r-tall", "r-wide", "r-sq", "r-wide", "r-tall", "r-sq", "r-tall", "r-wide", "r-sq"];
const tony = ["", "b", "c", "d", "e"];

function titleFromId(id: string) {
  const t = id.replace(/-/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export default async function Galeria({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ blad?: string }>;
}) {
  const { id } = await params;
  const { blad } = await searchParams;

  // Przykładowa galeria bez zdjęć
  if (id === "demo") {
    return (
      <>
        <Hero id={id} title="Anna & Marek" subtitle="Ślub, 14 września 2026" coverUrl={null} locked={false} error={false} />
        <main className="g-photos" id="zdjecia">
          <section className="masonry" aria-label="Przykładowe zdjęcia">
            {Array.from({ length: 18 }, (_, i) => (
              <div key={i} className={`tile ${proporcje[i % proporcje.length]} ${tony[(i * 3) % tony.length]}`} />
            ))}
          </section>
        </main>
      </>
    );
  }

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

  // Po wygaśnięciu pakietu klient widzi tylko krótką informację
  if (isExpired(meta)) {
    return (
      <section className="expired-page">
        <p className="wordmark">Lenslie</p>
        <h1>{title}</h1>
        <p>Dostęp do tej galerii wygasł. Skontaktuj się z fotografem, jeśli potrzebujesz zdjęć.</p>
      </section>
    );
  }

  // Galeria chroniona hasłem: bez ważnego ciasteczka pokazujemy tylko okładkę z polem na hasło
  const cookieStore = await cookies();
  if (!error && !hasAccess(id, meta, cookieStore.get(accessCookieName(id))?.value)) {
    const [summary, brand] = await Promise.all([
      getGallerySummary(id, meta?.cover).catch(() => ({ count: 0, coverUrl: null })),
      getGalleryBrand(id).catch(() => ({ studioName: null, logoUrl: null })),
    ]);
    return (
      <Hero
        id={id}
        title={title}
        subtitle={formatEventDate(meta?.eventDate)}
        studio={brand.studioName}
        coverUrl={summary.coverUrl}
        locked
        error={Boolean(blad)}
      />
    );
  }

  if (error) return <p className="notice">Nie udało się wczytać galerii. Odśwież stronę za chwilę.</p>;

  return <GalleryView id={id} meta={meta} title={title} mode="client" />;
}
