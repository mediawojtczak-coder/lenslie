import { GetObjectCommand } from "@aws-sdk/client-s3";
import { r2, BUCKET, isValidGalleryId, galleryPrefix } from "@/lib/r2";
import { getMeta, watermarkOn } from "@/lib/galleries";
import { listKeys, customCoverKey } from "@/lib/photos";

export const runtime = "nodejs";

// Stały adres okładki galerii – miniatura w podglądzie linku (Instagram, Messenger, WhatsApp, Facebook).
// Okładka i tak jest widoczna publicznie na ekranie z hasłem, więc nie odsłania zdjęć galerii.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidGalleryId(id)) return new Response("Not found", { status: 404 });
  const meta = await getMeta(id).catch(() => null);
  if (!meta) return new Response("Not found", { status: 404 });

  const prefix = galleryPrefix(id);
  const candidates: string[] = [];
  if (meta.coverFile) candidates.push(customCoverKey(id));
  const web = (await listKeys(`${prefix}web/`).catch(() => [] as string[])).sort((a, b) => a.localeCompare(b, "pl", { numeric: true }));
  const chosen = (meta.cover && web.find((k) => k === `${prefix}web/${meta.cover}.jpg`)) || web[0];
  if (chosen) {
    // przy znaku wodnym pokazujemy wersję ze znakiem
    if (watermarkOn(meta)) candidates.push(chosen.replace(`${prefix}web/`, `${prefix}wm/`));
    candidates.push(chosen);
  }

  for (const Key of candidates) {
    try {
      const obj = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key }));
      const bytes = await obj.Body?.transformToByteArray();
      if (!bytes) continue;
      return new Response(Buffer.from(bytes), {
        headers: {
          "Content-Type": obj.ContentType || "image/jpeg",
          "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
        },
      });
    } catch {
      // brak pliku – próbujemy następny
    }
  }
  return new Response("Not found", { status: 404 });
}
