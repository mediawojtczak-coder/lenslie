import { cookies } from "next/headers";
import Link from "next/link";
import { getGalleryPhotos, getGallerySummary, type Photo } from "@/lib/photos";
import { isValidGalleryId } from "@/lib/r2";
import { getMeta, hasAccess, accessCookieName, type GalleryMeta } from "@/lib/galleries";
import DownloadAll from "./DownloadAll";
import Hero from "./Hero";
import PhotoGrid from "./PhotoGrid";

export const dynamic = "force-dynamic";

const proporcje = ["r-tall", "r-wide", "r-sq", "r-wide", "r-tall", "r-sq", "r-tall", "r-wide", "r-sq"];
const tony = ["", "b", "c", "d", "e"];

function titleFromId(id: string) {
  const t = id.replace(/-/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function photosLabel(n: number) {
  if (n === 1) return "1 zdjęcie";
  const lastTwo = n % 100;
  const last = n % 10;
  if (last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) return `${n} zdjęcia`;
  return `${n} zdjęć`;
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
  const demo = id === "demo";
  const valid = isValidGalleryId(id);

  let meta: GalleryMeta | null = null;
  let error = false;
  if (valid && !demo) {
    try {
      meta = await getMeta(id);
    } catch {
      error = true;
    }
  }

  const title = demo ? "Anna & Marek" : meta?.title || titleFromId(id);

  // Galeria chroniona hasłem: bez ważnego ciasteczka pokazujemy tylko okładkę z polem na hasło
  const cookieStore = await cookies();
  if (!error && !hasAccess(id, meta, cookieStore.get(accessCookieName(id))?.value)) {
    const summary = await getGallerySummary(id).catch(() => ({ count: 0, coverUrl: null }));
    return <Hero id={id} title={title} coverUrl={summary.coverUrl} locked error={Boolean(blad)} />;
  }

  let photos: Photo[] = [];
  if (valid && !error) {
    try {
      photos = await getGalleryPhotos(id);
    } catch {
      error = true;
    }
  }

  const showPlaceholders = demo && photos.length === 0;
  const subtitle = demo ? "Ślub, 14 września 2026" : photos.length > 0 ? photosLabel(photos.length) : undefined;

  return (
    <>
      <Hero
        id={id}
        title={title}
        subtitle={subtitle}
        coverUrl={photos[0]?.webUrl ?? null}
        locked={false}
        error={false}
      />

      <div className="g-bar" id="zdjecia">
        <Link href="/" className="wordmark g-bar-mark">Lenslie</Link>
        <p className="g-bar-title">{title}</p>
        {photos.length > 0 ? (
          <DownloadAll
            zipName={`${id}.zip`}
            items={photos.map((p) => ({ url: p.downloadUrl, fileName: p.fileName }))}
          />
        ) : (
          <span />
        )}
      </div>

      <main className="g-photos">
        {error && <p className="notice">Nie udało się wczytać zdjęć. Odśwież stronę za chwilę.</p>}

        {!error && !showPlaceholders && photos.length === 0 && (
          <p className="notice">W tej galerii nie ma jeszcze zdjęć.</p>
        )}

        {showPlaceholders && (
          <section className="masonry" aria-label="Przykładowe zdjęcia">
            {Array.from({ length: 18 }, (_, i) => (
              <div
                key={i}
                className={`tile ${proporcje[i % proporcje.length]} ${tony[(i * 3) % tony.length]}`}
              />
            ))}
          </section>
        )}

        {photos.length > 0 && (
          <PhotoGrid
            layout={meta?.layout ?? "mozaika"}
            photos={photos.map((p) => ({
              name: p.name,
              fileName: p.fileName,
              webUrl: p.webUrl,
              downloadUrl: p.downloadUrl,
            }))}
          />
        )}
      </main>
    </>
  );
}
