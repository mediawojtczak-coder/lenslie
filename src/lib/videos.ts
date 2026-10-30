import { DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, BUCKET } from "@/lib/r2";
import { listObjects } from "@/lib/photos";

// Filmy w galeriach: oryginał w pełnej jakości w R2 (videos/<galeria>/…), podgląd do oglądania z Cloudflare Stream.
// Cena liczona po wgraniu pliku: koszt Lenslie × 2 (marża 100%), za okres do końca dostępu do galerii.

export type VideoStatus = "uploading" | "unpaid" | "processing" | "ready" | "error";
export type Video = {
  id: string;
  name: string; // nazwa pliku od fotografa
  key: string; // klucz oryginału w R2
  size: number; // bajty
  duration: number; // sekundy (z przeglądarki)
  status: VideoStatus;
  price?: number; // zł
  months?: number;
  streamUid?: string;
  preview?: string; // adres podglądu Stream (…/watch)
  thumbnail?: string;
  createdAt: string;
  paidAt?: string;
  uploadId?: string; // wieloczęściowe wgrywanie w toku
  partSize?: number; // rozmiar części przy wgrywaniu (do wznawiania)
};

export const videoPrefix = (galleryId: string) => `videos/${galleryId}/`;

// Filmy są w cenie galerii – ich pliki liczą się do miejsca pakietu (GB) razem ze zdjęciami
export const galleryVideoBytes = (videos?: Video[]) => (videos ?? []).reduce((s, v) => s + (v.size || 0), 0);

// ===== Koszty i cena =====
export const USD_PLN = Number(process.env.USD_PLN || 4.0);
export const R2_GB_MONTH = 0.015; // USD
export const STREAM_MIN_MONTH = 0.005; // USD (5 USD / 1000 minut miesięcznie)
export const STREAM_MIN_VIEW = 0.001; // USD (1 USD / 1000 minut obejrzanych)
const EST_VIEWS = 30; // ile razy (średnio) ktoś obejrzy cały film
export const MARKUP = 2; // marża 100%
export const MIN_PRICE = 2; // zł – poniżej prowizja płatności zjadłaby całość

export function streamEnabled() {
  return Boolean(process.env.CLOUDFLARE_STREAM_TOKEN && accountId());
}

export function accountId() {
  if (process.env.CLOUDFLARE_ACCOUNT_ID) return process.env.CLOUDFLARE_ACCOUNT_ID;
  // Konto Cloudflare jest w adresie R2: https://<konto>.r2.cloudflarestorage.com
  const m = /^https:\/\/([a-f0-9]{32})\./.exec(process.env.R2_ENDPOINT ?? "");
  return m?.[1] ?? "";
}

// Koszt Lenslie (zł) za przechowanie filmu przez `months` miesięcy (+ szacowane odtworzenia przy pierwszym zakupie)
export function videoCost(size: number, duration: number, months: number, withViews = true) {
  const gb = size / 1024 ** 3;
  const minutes = Math.max(1, Math.ceil(duration / 60));
  let usd = gb * R2_GB_MONTH * months;
  if (streamEnabled()) {
    usd += minutes * STREAM_MIN_MONTH * months;
    if (withViews) usd += minutes * EST_VIEWS * STREAM_MIN_VIEW;
  }
  return usd * USD_PLN;
}

export function videoPrice(size: number, duration: number, months: number, withViews = true) {
  return Math.max(MIN_PRICE, Math.ceil(videoCost(size, duration, months, withViews) * MARKUP));
}

// Ile pełnych miesięcy zostało do końca dostępu do galerii (co najmniej 1)
export function monthsLeft(expiresAt?: string) {
  if (!expiresAt) return 1;
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Math.max(1, Math.ceil(ms / (30.44 * 24 * 3600 * 1000)));
}

// ===== Cloudflare Stream =====
async function streamApi(path: string, init?: RequestInit) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId()}/stream${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_STREAM_TOKEN}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) throw new Error(`Stream ${res.status}: ${JSON.stringify(data.errors ?? data).slice(0, 300)}`);
  return data.result;
}

// Przekazuje oryginał z R2 do Stream – Stream sam pobiera plik i przygotowuje podgląd (do 1080p)
export async function streamCopy(key: string, name: string): Promise<string> {
  const url = await getSignedUrl(r2, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: 6 * 3600 });
  const result = await streamApi("/copy", { method: "POST", body: JSON.stringify({ url, meta: { name } }) });
  return result.uid as string;
}

export async function streamStatus(uid: string): Promise<{ ready: boolean; error: boolean; preview?: string; thumbnail?: string; duration?: number }> {
  const r = await streamApi(`/${uid}`);
  return {
    ready: Boolean(r.readyToStream),
    error: r.status?.state === "error",
    preview: r.preview,
    thumbnail: r.thumbnail,
    duration: r.duration,
  };
}

export async function streamDelete(uid: string) {
  await streamApi(`/${uid}`, { method: "DELETE" }).catch(() => undefined);
}

// Adres odtwarzacza Stream z adresu podglądu (…/watch → …/iframe)
export const iframeUrl = (preview?: string) => (preview ? preview.replace(/\/watch$/, "/iframe") : undefined);

// Uzupełnia stan filmów w trakcie przetwarzania. Zwraca true, gdy coś się zmieniło.
export async function refreshVideos(videos: Video[]): Promise<boolean> {
  let changed = false;
  for (const v of videos) {
    if (v.status !== "processing" || !v.streamUid || !streamEnabled()) continue;
    const s = await streamStatus(v.streamUid).catch(() => null);
    if (!s) continue;
    if (s.ready) {
      v.status = "ready";
      v.preview = s.preview;
      v.thumbnail = s.thumbnail;
      changed = true;
    } else if (s.error) {
      v.status = "error";
      changed = true;
    }
  }
  return changed;
}

// Po opłaceniu: wysyła filmy do Stream (albo, bez Stream, od razu udostępnia oryginał)
export async function startVideos(videos: Video[], ids: string[]) {
  for (const v of videos) {
    if (!ids.includes(v.id) || v.status !== "unpaid") continue;
    v.paidAt = new Date().toISOString();
    if (streamEnabled()) {
      try {
        v.streamUid = await streamCopy(v.key, v.name);
        v.status = "processing";
      } catch (err) {
        console.error("Stream:", err);
        v.status = "ready"; // awaryjnie odtwarzamy oryginał
      }
    } else {
      v.status = "ready";
    }
  }
}

export async function signedVideoUrl(key: string, download?: string) {
  return getSignedUrl(
    r2,
    new GetObjectCommand({ Bucket: BUCKET, Key: key, ...(download ? { ResponseContentDisposition: `attachment; filename="${download}"` } : {}) }),
    { expiresIn: 6 * 3600 },
  );
}

export async function deleteVideo(v: Video) {
  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: v.key })).catch(() => undefined);
  if (v.streamUid) await streamDelete(v.streamUid);
}

// Usuwa wszystkie filmy galerii (przy usuwaniu galerii)
export async function deleteGalleryVideos(galleryId: string, videos: Video[] = []) {
  for (const v of videos) if (v.streamUid) await streamDelete(v.streamUid);
  for (const o of await listObjects(videoPrefix(galleryId)).catch(() => [])) {
    await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: o.key })).catch(() => undefined);
  }
}
