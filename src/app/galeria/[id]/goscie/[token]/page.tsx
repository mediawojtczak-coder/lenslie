import { timingSafeEqual } from "crypto";
import { isValidGalleryId } from "@/lib/r2";
import { getMeta, isExpired } from "@/lib/galleries";
import GalleryView from "../../GalleryView";

export const dynamic = "force-dynamic";

// Galerie są prywatne – nie pokazujemy ich w wyszukiwarkach
export const metadata = { robots: { index: false, follow: false } };

function sameToken(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

// Galeria dla gości: osobny link bez hasła, tylko wybrane sekcje i ograniczone pobieranie
export default async function GalleriaGosci({ params }: { params: Promise<{ id: string; token: string }> }) {
  const { id, token } = await params;
  const meta = isValidGalleryId(id) ? await getMeta(id).catch(() => null) : null;
  const guest = meta?.guest;

  if (!meta || !guest?.enabled || !sameToken(guest.token, String(token))) {
    return (
      <section className="expired-page">
        <p className="wordmark">Lenslie</p>
        <h1>Link jest nieaktywny</h1>
        <p>Ten link do galerii wygasł albo został wyłączony. Poproś parę młodą lub fotografa o nowy.</p>
      </section>
    );
  }
  if (isExpired(meta)) {
    return (
      <section className="expired-page">
        <p className="wordmark">Lenslie</p>
        <h1>{meta.title}</h1>
        <p>Dostęp do tej galerii wygasł.</p>
      </section>
    );
  }

  return <GalleryView id={id} meta={meta} title={meta.title} mode="guest" />;
}
