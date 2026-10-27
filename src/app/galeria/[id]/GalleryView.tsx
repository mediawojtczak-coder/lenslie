import Link from "next/link";
import { getGalleryPhotos, pickCover, applyOrder, getMusicUrl, type Photo } from "@/lib/photos";
import { watermarkOn, type GalleryMeta, type Downloads } from "@/lib/galleries";
import DownloadAll from "./DownloadAll";
import Hero from "./Hero";
import PhotoGrid, { type Group, type GridItem } from "./PhotoGrid";
import SlideshowButton from "./SlideshowButton";

const dateFmt = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export function formatEventDate(d?: string) {
  return d ? dateFmt.format(new Date(`${d}T00:00:00Z`)) : undefined;
}

function photosLabel(n: number) {
  if (n === 1) return "1 zdjęcie";
  const lastTwo = n % 100;
  const last = n % 10;
  if (last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) return `${n} zdjęcia`;
  return `${n} zdjęć`;
}

const rank: Record<Downloads, number> = { none: 0, web: 1, all: 2 };

// Galeria widziana przez klienta albo przez gości (osobny link)
export default async function GalleryView({
  id,
  meta,
  title,
  mode,
}: {
  id: string;
  meta: GalleryMeta | null;
  title: string;
  mode: "client" | "guest";
}) {
  const watermark = watermarkOn(meta) ? meta!.watermark!.text : null;

  let error = false;
  let photos: Photo[] = [];
  try {
    photos = applyOrder(await getGalleryPhotos(id, { watermark: Boolean(watermark) }), meta?.order);
  } catch {
    error = true;
  }

  // Goście nigdy nie dostają więcej niż klient
  const clientDownloads: Downloads = meta?.downloads ?? "all";
  const guest = meta?.guest;
  const downloads: Downloads =
    mode === "guest" && guest
      ? rank[guest.downloads] < rank[clientDownloads]
        ? guest.downloads
        : clientDownloads
      : clientDownloads;

  const toItem = (p: Photo): GridItem => ({
    name: p.name,
    fileName: p.fileName,
    webUrl: p.webUrl,
    downloadUrl: downloads === "all" ? p.downloadUrl : undefined,
    webDownloadUrl: downloads !== "none" ? p.webDownloadUrl : undefined,
    webFileName: p.webFileName,
    wmPending: Boolean(watermark) && p.watermarked === false,
  });

  // Sekcje w kolejności ustawionej przez fotografa; goście widzą tylko wybrane sekcje
  const sections = meta?.sections ?? [];
  const assigned = meta?.photoSection ?? {};
  const known = new Set(sections.map((x) => x.id));
  const guestOnly = mode === "guest" && guest && guest.sections.length > 0 ? new Set(guest.sections) : null;
  let groups: Group[] = [
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
  if (guestOnly) groups = groups.filter((g) => guestOnly.has(g.id));
  const visible = groups.flatMap((g) => g.photos);
  const visibleNames = new Set(visible.map((p) => p.name));
  const shown = photos.filter((p) => visibleNames.has(p.name));

  const subtitle =
    [formatEventDate(meta?.eventDate), shown.length > 0 ? photosLabel(shown.length) : null].filter(Boolean).join(" · ") ||
    undefined;
  const musicUrl = meta?.music ? await getMusicUrl(id).catch(() => null) : null;
  const cover = pickCover(shown, meta?.cover) ?? pickCover(photos, meta?.cover);

  return (
    <>
      <Hero id={id} title={title} subtitle={subtitle} coverUrl={cover?.webUrl ?? null} locked={false} error={false} />

      <div className="g-bar" id="zdjecia">
        <Link href="/" className="wordmark g-bar-mark">
          Lenslie
        </Link>
        <p className="g-bar-title">{title}</p>
        <div className="g-bar-actions">
          {visible.length > 1 && <SlideshowButton />}
          {visible.length > 0 && downloads !== "none" && (
            <DownloadAll
              zipName={`${id}.zip`}
              allowFull={downloads === "all"}
              items={visible.map((p) => ({
                url: p.downloadUrl ?? "",
                fileName: p.fileName,
                webUrl: p.webDownloadUrl ?? "",
                webFileName: p.webFileName,
              }))}
            />
          )}
          {mode === "client" && meta?.passwordHash && (
            <form method="post" action={`/api/galleries/${id}/lock`}>
              <button type="submit" className="g-logout">
                Wyloguj
              </button>
            </form>
          )}
        </div>
      </div>

      <main className="g-photos">
        {meta?.welcome && <p className="g-welcome">{meta.welcome}</p>}
        {error && <p className="notice">Nie udało się wczytać zdjęć. Odśwież stronę za chwilę.</p>}
        {!error && visible.length === 0 && <p className="notice">W tej galerii nie ma jeszcze zdjęć.</p>}
        {visible.length > 0 && (
          <PhotoGrid
            layout={meta?.layout ?? "mozaika"}
            groups={groups}
            zipBase={id}
            musicUrl={musicUrl}
            downloads={downloads}
            watermark={watermark}
          />
        )}
      </main>
    </>
  );
}
