import { lrUser, lrError, ownsGallery } from "@/lib/lr";
import { prepareUploads, type FileInfo } from "@/lib/uploads";
import { siteUrl } from "@/lib/email";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { r2, BUCKET, galleryPrefix, baseName } from "@/lib/r2";

export const runtime = "nodejs";

// Podpisane linki do wgrania zdjęć z Lightrooma (oryginał + wersja 2048 px do oglądania)
export async function POST(req: Request) {
  const user = await lrUser(req);
  if (!user) return lrError("pl", "Zaloguj się ponownie we wtyczce.", "Sign in again in the plugin.", 401);
  const body = (await req.json().catch(() => null)) as { gallery?: string; files?: FileInfo[] } | null;
  const gallery = String(body?.gallery ?? "");
  if (!(await ownsGallery(user.uid, gallery))) return lrError(user.lang, "Nie znaleziono galerii w Twoim koncie.", "Gallery not found in your account.", 404);
  const files = Array.isArray(body?.files) ? body.files.slice(0, 50) : [];
  if (!files.length) return lrError(user.lang, "Brak zdjęć do wysłania.", "No photos to upload.");
  const res = await prepareUploads(gallery, files, user.lang, false);
  if (!res.ok) return Response.json({ error: res.error, code: res.code }, { status: res.status });
  // Ponowna publikacja (np. po poprawkach w Lightroomie): stary znak wodny usuwamy, panel nałoży go na nową wersję
  if (res.watermark) {
    await Promise.all(
      res.uploads.map((u) =>
        r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: `${galleryPrefix(gallery)}wm/${baseName(u.file)}.jpg` })).catch(() => undefined),
      ),
    );
  }
  return Response.json({
    uploads: res.uploads.map((u) => ({ name: u.name, file: u.file, id: u.file.replace(/\.[^.]+$/, ""), originalUrl: u.originalUrl, webUrl: u.webUrl, type: u.type })),
    url: `${siteUrl()}/panel/galeria/${gallery}`,
    watermark: Boolean(res.watermark),
  });
}
