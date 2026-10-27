import { cookies } from "next/headers";
import { getGalleryPhotos, type Photo } from "@/lib/photos";
import { isValidGalleryId } from "@/lib/r2";
import { getMeta, hasAccess, accessCookieName, type GalleryMeta } from "@/lib/galleries";
import DownloadAll from "./DownloadAll";

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

  // Galeria chroniona hasłem: bez ważnego ciasteczka pokazujemy tylko formularz
  const cookieStore = await cookies();
  if (!error && !hasAccess(id, meta, cookieStore.get(accessCookieName(id))?.value)) {
    return (
      <section className="narrow gate">
        <h1>{title}</h1>
        <p className="lead">Ta galeria jest prywatna. Wpisz hasło otrzymane od fotografa.</p>
        <form method="post" action={`/api/galleries/${id}/unlock`}>
          <label htmlFor="password">Hasło do galerii</label>
          <input id="password" name="password" type="password" autoComplete="off" required autoFocus />
          {blad && (
            <p className="error" role="alert">
              Nieprawidłowe hasło. Sprawdź wiadomość od fotografa i spróbuj ponownie.
            </p>
          )}
          <button className="btn" type="submit">Otwórz galerię</button>
        </form>
      </section>
    );
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

  return (
    <>
      <section className="cover">
        <h1>{title}</h1>
        <p className="meta">
          {demo ? "Ślub, 14 września 2026" : photos.length > 0 ? photosLabel(photos.length) : "Galeria"}
        </p>
        {photos.length > 0 && (
          <DownloadAll
            zipName={`${id}.zip`}
            items={photos.map((p) => ({ url: p.downloadUrl, fileName: p.fileName }))}
          />
        )}
      </section>

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
        <section className="masonry" aria-label="Zdjęcia">
          {photos.map((p) => (
            <figure key={p.name} className="photo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.webUrl} alt={p.name} loading="lazy" />
              <a className="photo-dl" href={p.downloadUrl} download>
                Pobierz
              </a>
            </figure>
          ))}
        </section>
      )}
    </>
  );
}
