import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { r2, BUCKET, baseName, galleryPrefix } from "@/lib/r2";
import { presigner, presignGet } from "@/lib/presign";

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
  // false, gdy znak wodny jest włączony, ale wersja ze znakiem jeszcze nie powstała
  watermarked?: boolean;
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
// Ze znakiem wodnym podgląd i wersja do internetu pochodzą z galleries/<id>/wm/.
export async function getGalleryPhotos(id: string, opts: { watermark?: boolean } = {}): Promise<Photo[]> {
  if (!process.env.R2_ENDPOINT) return [];
  const prefix = galleryPrefix(id);
  const [webObjs, originalObjs, wmObjs] = await Promise.all([
    listObjects(`${prefix}web/`),
    listObjects(`${prefix}original/`),
    opts.watermark ? listObjects(`${prefix}wm/`) : Promise.resolve([] as Obj[]),
  ]);
  return buildPhotos(prefix, webObjs, originalObjs, wmObjs, opts);
}

// Zdjęcia i zajęte miejsce z jednego przeglądu magazynu (panel galerii – szybciej niż osobno)
export async function getGalleryPhotosAndUsage(id: string, opts: { watermark?: boolean } = {}): Promise<{ photos: Photo[]; usage: number; wmKeys: Set<string> }> {
  if (!process.env.R2_ENDPOINT) return { photos: [], usage: 0, wmKeys: new Set() };
  const prefix = galleryPrefix(id);
  const all = await listObjects(prefix);
  const pick = (sub: string) => all.filter((o) => o.key.startsWith(`${prefix}${sub}/`));
  const wm = pick("wm");
  const photos = await buildPhotos(prefix, pick("web"), pick("original"), opts.watermark ? wm : [], opts);
  return { photos, usage: all.reduce((s, o) => s + o.size, 0), wmKeys: new Set(wm.map((o) => o.key)) };
}

async function buildPhotos(prefix: string, webObjs: Obj[], originalObjs: Obj[], wmObjs: Obj[], opts: { watermark?: boolean }): Promise<Photo[]> {
  const sign = await presigner();
  const wmKeys = new Set(wmObjs.map((o) => o.key));
  const webKeys = webObjs.map((o) => o.key);

  const originals = new Map<string, Obj>();
  for (const o of originalObjs) {
    const file = o.key.slice(`${prefix}original/`.length);
    originals.set(baseName(file), o);
  }

  webKeys.sort((a, b) => a.localeCompare(b, "pl", { numeric: true }));

  return Promise.all(
    webKeys.map(async (plainKey) => {
      const file = plainKey.slice(`${prefix}web/`.length);
      const wmKey = `${prefix}wm/${file}`;
      const hasWm = wmKeys.has(wmKey);
      const key = hasWm ? wmKey : plainKey;
      const name = baseName(file);
      const original = originals.get(name);
      const originalKey = original?.key ?? key;
      const originalFile = originalKey.split("/").pop() ?? file;

      const webFileName = `${name}-internet.jpg`;
      const [webUrl, downloadUrl, webDownloadUrl] = await Promise.all([
        sign(key, { expiresIn: 7200 }),
        sign(originalKey, { expiresIn: 7200, disposition: `attachment; filename="${originalFile}"` }),
        sign(key, { expiresIn: 7200, disposition: `attachment; filename="${webFileName}"` }),
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
        watermarked: opts.watermark ? hasWm : undefined,
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
  const coverUrl = await presignGet(chosen ?? keys[0], { expiresIn: 7200 });
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

// Układa zdjęcia według kolejności ustawionej przez fotografa; nowe zdjęcia trafiają na koniec
export function applyOrder<T extends { name: string }>(photos: T[], order?: string[]): T[] {
  if (!order?.length) return photos;
  const pos = new Map(order.map((n, i) => [n, i]));
  return photos
    .map((p, i) => ({ p, i }))
    .sort((a, b) => {
      const pa = pos.get(a.p.name);
      const pb = pos.get(b.p.name);
      if (pa !== undefined && pb !== undefined) return pa - pb;
      if (pa !== undefined) return -1;
      if (pb !== undefined) return 1;
      return a.i - b.i;
    })
    .map((x) => x.p);
}

// Link do muzyki pokazu slajdów (ważny 2 godziny)
export async function getMusicUrl(id: string): Promise<string> {
  return presignGet(`${galleryPrefix(id)}music.mp3`, { expiresIn: 7200 });
}
