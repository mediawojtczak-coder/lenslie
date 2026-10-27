import { getGalleryPhotos, type Photo } from "@/lib/photos";
import { isValidGalleryId } from "@/lib/r2";

export const dynamic = "force-dynamic";

const proporcje = ["r-tall", "r-wide", "r-sq", "r-wide", "r-tall", "r-sq", "r-tall", "r-wide", "r-sq"];
const tony = ["", "b", "c", "d", "e"];

function title(id: string) {
  const t = id.replace(/-/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export default async function Galeria({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const demo = id === "demo";

  let photos: Photo[] = [];
  let error = false;
  if (isValidGalleryId(id)) {
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
        <h1>{demo ? "Anna & Marek" : title(id)}</h1>
        <p className="meta">
          {demo
            ? "Ślub, 14 września 2026"
            : photos.length > 0
              ? `${photos.length} ${photos.length === 1 ? "zdjęcie" : "zdjęć"}`
              : "Galeria"}
        </p>
      </section>

      {error && (
        <p className="notice">Nie udało się wczytać zdjęć. Odśwież stronę za chwilę.</p>
      )}

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
