import { cookies } from "next/headers";
import Link from "next/link";
import { getGalleryPhotos, getGallerySummary, pickCover, applyOrder, getMusicUrl, type Photo } from "@/lib/photos";
import { isValidGalleryId } from "@/lib/r2";
import { getMeta, hasAccess, accessCookieName, isExpired, type GalleryMeta } from "@/lib/galleries";
import DownloadAll from "./DownloadAll";
import Hero from "./Hero";
import PhotoGrid, { type Group } from "./PhotoGrid";
import SlideshowButton from "./SlideshowButton";

export const dynamic = "force-dynamic";

const proporcje = ["r-tall", "r-wide", "r-sq", "r-wide", "r-tall", "r-sq", "r-tall", "r-wide", "r-sq"];
const tony = ["", "b", "c", "d", "e"];

function titleFromId(id: string) {
  const t = id.replace(/-/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

const dateFmt = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

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

  // Po wygaśnięciu pakietu klient widzi tylko krótką informację
  if (!demo && isExpired(meta)) {
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
    const summary = await getGallerySummary(id, meta?.cover).catch(() => ({ count: 0, coverUrl: null }));
    const lockedSub = meta?.eventDate ? dateFmt.format(new Date(`${meta.eventDate}T00:00:00Z`)) : undefined;
    return <Hero id={id} title={title} subtitle={lockedSub} coverUrl={summary.coverUrl} locked error={Boolean(blad)} />;
  }

  let photos: Photo[] = [];
  if (valid && !error) {
    try {
      photos = applyOrder(await getGalleryPhotos(id), meta?.order);
    } catch {
      error = true;
    }
  }

  const showPlaceholders = demo && photos.length === 0;
  const eventDate = meta?.eventDate ? dateFmt.format(new Date(`${meta.eventDate}T00:00:00Z`)) : null;
  const subtitle = demo
    ? "Ślub, 14 września 2026"
    : [eventDate, photos.length > 0 ? photosLabel(photos.length) : null].filter(Boolean).join(" · ") || undefined;

  // Zdjęcia pogrupowane w sekcje w kolejności ustawionej przez fotografa; bez sekcji – jedna grupa
  const toItem = (p: Photo) => ({
    name: p.name,
    fileName: p.fileName,
    webUrl: p.webUrl,
    downloadUrl: p.downloadUrl,
    webDownloadUrl: p.webDownloadUrl,
    webFileName: p.webFileName,
  });
  const sections = meta?.sections ?? [];
  const assigned = meta?.photoSection ?? {};
  const known = new Set(sections.map((x) => x.id));
  const groups: Group[] = [
    ...sections.map((sec) => ({
      id: sec.id,
      name: sec.name,
      photos: photos.filter((p) => assigned[p.name] === sec.id).map(toItem),
    })),
    {
      id: "pozostale",
      name: null,
      photos: photos.filter((p) => !known.has(assigned[p.name] ?? "")).map(toItem),
    },
  ];
  const musicUrl = meta?.music ? await getMusicUrl(id).catch(() => null) : null;

  return (
    <>
      <Hero
        id={id}
        title={title}
        subtitle={subtitle}
        coverUrl={pickCover(photos, meta?.cover)?.webUrl ?? null}
        locked={false}
        error={false}
      />

      <div className="g-bar" id="zdjecia">
        <Link href="/" className="wordmark g-bar-mark">Lenslie</Link>
        <p className="g-bar-title">{title}</p>
        <div className="g-bar-actions">
          {photos.length > 1 && <SlideshowButton />}
          {photos.length > 0 && (
            <DownloadAll
              zipName={`${id}.zip`}
              items={photos.map((p) => ({
                url: p.downloadUrl,
                fileName: p.fileName,
                webUrl: p.webDownloadUrl,
                webFileName: p.webFileName,
              }))}
            />
          )}
          {meta?.passwordHash && (
            <form method="post" action={`/api/galleries/${id}/lock`}>
              <button type="submit" className="g-logout">Wyloguj</button>
            </form>
          )}
        </div>
      </div>

      <main className="g-photos">
        {meta?.welcome && <p className="g-welcome">{meta.welcome}</p>}

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
          <PhotoGrid layout={meta?.layout ?? "mozaika"} groups={groups} zipBase={id} musicUrl={musicUrl} />
        )}
      </main>
    </>
  );
}
