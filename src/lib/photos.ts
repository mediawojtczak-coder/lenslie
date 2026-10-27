import { GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, BUCKET, baseName, galleryPrefix } from "@/lib/r2";

export type Photo = {
  name: string;
  fileName: string;
  webUrl: string;
  downloadUrl: string;
  // Lżejsza wersja do internetu (max 2048 px)
  webDownloadUrl: string;
  webFileName: string;
  size: number;
  uploadedAt: string;
};

type Obj = { key: string; size: number; modified: string };

export async function listObjects(prefix: string): Promise<Obj[]> {
  const out: Obj[] = [];
  let token: string | undefined;
  do {
    const res = await r2.send(
      new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix, ContinuationToken: token }),
    );
    for (const obj of res.Contents ?? []) {
      if (obj.Key) {
        out.push({ key: obj.Key, size: obj.Size ?? 0, modified: obj.LastModified?.toISOString() ?? "" });
      }
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return out;
}

export async function listKeys(prefix: string) {
  return (await listObjects(prefix)).map((o) => o.key);
}

// Zwraca zdjęcia galerii z tymczasowymi linkami (ważnymi 2 godziny).
export async function getGalleryPhotos(id: string): Promise<Photo[]> {
  if (!process.env.R2_ENDPOINT) return [];
  const prefix = galleryPrefix(id);

  const [webObjs, originalObjs] = await Promise.all([
    listObjects(`${prefix}web/`),
    listObjects(`${prefix}original/`),
  ]);
  const webKeys = webObjs.map((o) => o.key);

  const originals = new Map<string, Obj>();
  for (const o of originalObjs) {
    const file = o.key.slice(`${prefix}original/`.length);
    originals.set(baseName(file), o);
  }

  webKeys.sort((a, b) => a.localeCompare(b, "pl", { numeric: true }));

  return Promise.all(
    webKeys.map(async (key) => {
      const file = key.slice(`${prefix}web/`.length);
      const name = baseName(file);
      const original = originals.get(name);
      const originalKey = original?.key ?? key;
      const originalFile = originalKey.split("/").pop() ?? file;

      const webFileName = `${name}-internet.jpg`;
      const [webUrl, downloadUrl, webDownloadUrl] = await Promise.all([
        getSignedUrl(r2, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: 7200 }),
        getSignedUrl(
          r2,
          new GetObjectCommand({
            Bucket: BUCKET,
            Key: originalKey,
            ResponseContentDisposition: `attachment; filename="${originalFile}"`,
          }),
          { expiresIn: 7200 },
        ),
        getSignedUrl(
          r2,
          new GetObjectCommand({
            Bucket: BUCKET,
            Key: key,
            ResponseContentDisposition: `attachment; filename="${webFileName}"`,
          }),
          { expiresIn: 7200 },
        ),
      ]);

      return {
        name,
        fileName: originalFile,
        webUrl,
        downloadUrl,
        webDownloadUrl,
        webFileName,
        size: original?.size ?? 0,
        uploadedAt: original?.modified ?? "",
      };
    }),
  );
}

// Okładka i liczba zdjęć galerii (do kafelków w panelu)
export async function getGallerySummary(
  id: string,
  cover?: string,
): Promise<{ count: number; coverUrl: string | null }> {
  if (!process.env.R2_ENDPOINT) return { count: 0, coverUrl: null };
  const keys = await listKeys(`${galleryPrefix(id)}web/`);
  if (keys.length === 0) return { count: 0, coverUrl: null };
  keys.sort((a, b) => a.localeCompare(b, "pl", { numeric: true }));
  // Wybrana okładka, a jeśli jej nie ma (np. usunięta) – pierwsze zdjęcie
  const chosen = cover ? keys.find((k) => k === `${galleryPrefix(id)}web/${cover}.jpg`) : undefined;
  const coverUrl = await getSignedUrl(r2, new GetObjectCommand({ Bucket: BUCKET, Key: chosen ?? keys[0] }), {
    expiresIn: 7200,
  });
  return { count: keys.length, coverUrl };
}

// Ile miejsca zajmuje galeria (oryginały + wersje do oglądania)
export async function getGalleryUsage(id: string): Promise<number> {
  if (!process.env.R2_ENDPOINT) return 0;
  const objs = await listObjects(galleryPrefix(id));
  return objs.reduce((sum, o) => sum + o.size, 0);
}

// Zdjęcie główne galerii: wybrane przez fotografa albo pierwsze
export function pickCover<T extends { name: string }>(photos: T[], cover?: string): T | undefined {
  return (cover && photos.find((p) => p.name === cover)) || photos[0];
}
