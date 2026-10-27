import { randomBytes } from "crypto";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, BUCKET, baseName } from "@/lib/r2";
import { listObjects } from "@/lib/photos";
import { streamEnabled, streamCopy, streamStatus, streamDelete, iframeUrl } from "@/lib/videos";

// Zdjęcia od gości: galeria wesela, do której goście wgrywają zdjęcia z telefonów (kod QR na stołach).
// Płatna jednorazowo za wydarzenie; aktywna przez rok, potem 30 dni na pobranie i usunięcie.

export const GUEST_PRICE = 99; // zł
export const GUEST_DAYS = 365;
export const GUEST_LIMIT_GB = 30;
export const GUEST_DELETE_AFTER = 30; // dni po wygaśnięciu

export type GuestEvent = {
  id: string;
  uid: string;
  title: string;
  date: string;
  welcome: string;
  lang: "pl" | "en";
  status: "draft" | "active";
  showWall: boolean;
  allowDownload: boolean;
  createdAt: string;
  paidAt?: string;
  expiresAt?: string;
  warned?: string;
  // Zdjęcie na okładkę strony gości (guests/<id>/cover.jpg) – znacznik czasu do odświeżania
  cover?: string;
};

export type GuestPhoto = { name: string; webUrl: string; downloadUrl: string; webDownloadUrl: string; fileName: string; webFileName: string; at: string; size: number };

export const guestPrefix = (id: string) => `guests/${id}/`;
const metaKey = (id: string) => `${guestPrefix(id)}meta.json`;
const userKey = (uid: string) => `guests-users/${uid}.json`;

export const isGuestEventId = (id: string) => /^[a-z0-9-]{6,80}$/.test(id);

async function getJson<T>(key: string): Promise<T | null> {
  try {
    const res = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    const text = await res.Body?.transformToString();
    return text ? (JSON.parse(text) as T) : null;
  } catch {
    return null;
  }
}
const putJson = (key: string, v: unknown) =>
  r2.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: JSON.stringify(v), ContentType: "application/json" }));

export const getGuestEvent = (id: string) => (isGuestEventId(id) ? getJson<GuestEvent>(metaKey(id)) : Promise.resolve(null));
export const saveGuestEvent = (e: GuestEvent) => putJson(metaKey(e.id), e);

export function guestActive(e: GuestEvent | null) {
  return Boolean(e && e.status === "active" && e.expiresAt && new Date(e.expiresAt).getTime() > Date.now());
}

export async function listUserGuestEvents(uid: string): Promise<GuestEvent[]> {
  const ids = (await getJson<{ events: string[] }>(userKey(uid)))?.events ?? [];
  const list = await Promise.all(ids.map((id) => getGuestEvent(id)));
  return list.filter((e): e is GuestEvent => Boolean(e && e.uid === uid));
}

function slug(text: string) {
  return text
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export async function createGuestEvent(uid: string, title: string, lang: "pl" | "en"): Promise<GuestEvent> {
  // Losowa końcówka: link jest jedynym „kluczem” do galerii gości
  const id = `${slug(title) || "wesele"}-${randomBytes(4).toString("hex")}`;
  const e: GuestEvent = {
    id,
    uid,
    title,
    date: "",
    welcome: "",
    lang,
    status: "draft",
    showWall: true,
    allowDownload: true,
    createdAt: new Date().toISOString(),
  };
  await saveGuestEvent(e);
  const idx = (await getJson<{ events: string[] }>(userKey(uid)))?.events ?? [];
  await putJson(userKey(uid), { events: [id, ...idx.filter((x) => x !== id)] });
  return e;
}

export async function activateGuestEvent(id: string) {
  const e = await getGuestEvent(id);
  if (!e) return;
  const now = new Date();
  e.status = "active";
  e.paidAt = now.toISOString();
  e.expiresAt = new Date(now.getTime() + GUEST_DAYS * 24 * 3600 * 1000).toISOString();
  await saveGuestEvent(e);
}

export async function deleteGuestEvent(e: GuestEvent) {
  for (const o of await listObjects(`${guestPrefix(e.id)}vmeta/`).catch(() => [])) {
    const vm = await getJson<GuestVideoMeta>(o.key);
    if (vm?.streamUid) await streamDelete(vm.streamUid);
  }
  const objs = await listObjects(guestPrefix(e.id)).catch(() => []);
  for (let i = 0; i < objs.length; i += 10) {
    await Promise.all(objs.slice(i, i + 10).map((o) => r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: o.key }))));
  }
  const idx = (await getJson<{ events: string[] }>(userKey(e.uid)))?.events ?? [];
  await putJson(userKey(e.uid), { events: idx.filter((x) => x !== e.id) });
}

export async function guestUsage(id: string) {
  const objs = await listObjects(guestPrefix(id)).catch(() => []);
  return objs.reduce((s, o) => s + o.size, 0);
}

// Zdjęcia gości, najnowsze na górze, z linkami ważnymi 2 godziny
export async function getGuestPhotos(id: string): Promise<GuestPhoto[]> {
  const p = guestPrefix(id);
  const [webObjs, origObjs] = await Promise.all([listObjects(`${p}web/`), listObjects(`${p}original/`)]);
  const originals = new Map(origObjs.map((o) => [baseName(o.key.slice(`${p}original/`.length)), o]));
  webObjs.sort((a, b) => b.modified.localeCompare(a.modified) || b.key.localeCompare(a.key));
  return Promise.all(
    webObjs.map(async (w) => {
      const file = w.key.slice(`${p}web/`.length);
      const name = baseName(file);
      const orig = originals.get(name);
      const origKey = orig?.key ?? w.key;
      const fileName = origKey.split("/").pop() ?? file;
      const webFileName = `${name}-internet.jpg`;
      const [webUrl, downloadUrl, webDownloadUrl] = await Promise.all([
        getSignedUrl(r2, new GetObjectCommand({ Bucket: BUCKET, Key: w.key }), { expiresIn: 7200 }),
        getSignedUrl(r2, new GetObjectCommand({ Bucket: BUCKET, Key: origKey, ResponseContentDisposition: `attachment; filename="${fileName}"` }), {
          expiresIn: 7200,
        }),
        getSignedUrl(r2, new GetObjectCommand({ Bucket: BUCKET, Key: w.key, ResponseContentDisposition: `attachment; filename="${webFileName}"` }), {
          expiresIn: 7200,
        }),
      ]);
      return { name, webUrl, downloadUrl, webDownloadUrl, fileName, webFileName, at: w.modified, size: (orig?.size ?? 0) + w.size };
    }),
  );
}

// ===== Filmy od gości (w cenie wydarzenia) =====
export type GuestVideoMeta = { streamUid?: string; state: "processing" | "ready" | "error"; preview?: string; thumbnail?: string };
export type GuestVideo = { name: string; fileName: string; src: string; iframe?: string; poster?: string; downloadUrl: string; size: number; at: string; processing: boolean };
export const GUEST_VIDEO_MAX = 4 * 1024 ** 3;
const vmetaKey = (id: string, name: string) => `${guestPrefix(id)}vmeta/${name}.json`;

// Po wgraniu filmu przez gościa: Stream przygotowuje lekki podgląd (gdy jest włączony)
export async function guestVideoDone(id: string, name: string, fileName: string) {
  let vm: GuestVideoMeta = { state: "ready" };
  if (streamEnabled()) {
    try {
      vm = { state: "processing", streamUid: await streamCopy(`${guestPrefix(id)}video/${fileName}`, fileName) };
    } catch (err) {
      console.error("Stream (goście):", err);
    }
  }
  await putJson(vmetaKey(id, name), vm);
}

export async function getGuestVideos(id: string): Promise<GuestVideo[]> {
  const p = guestPrefix(id);
  const objs = await listObjects(`${p}video/`).catch(() => []);
  objs.sort((a, b) => b.modified.localeCompare(a.modified));
  return Promise.all(
    objs.map(async (o) => {
      const fileName = o.key.slice(`${p}video/`.length);
      const name = baseName(fileName);
      let vm = (await getJson<GuestVideoMeta>(vmetaKey(id, name))) ?? { state: "ready" as const };
      if (vm.state === "processing" && vm.streamUid && streamEnabled()) {
        const s = await streamStatus(vm.streamUid).catch(() => null);
        if (s?.ready) vm = { ...vm, state: "ready", preview: s.preview, thumbnail: s.thumbnail };
        else if (s?.error) vm = { ...vm, state: "error" };
        if (vm.state !== "processing") await putJson(vmetaKey(id, name), vm);
      }
      const [src, downloadUrl] = await Promise.all([
        getSignedUrl(r2, new GetObjectCommand({ Bucket: BUCKET, Key: o.key }), { expiresIn: 7200 }),
        getSignedUrl(r2, new GetObjectCommand({ Bucket: BUCKET, Key: o.key, ResponseContentDisposition: `attachment; filename="${fileName}"` }), { expiresIn: 7200 }),
      ]);
      return {
        name,
        fileName,
        src,
        iframe: vm.state === "ready" ? iframeUrl(vm.preview) : undefined,
        poster: vm.thumbnail,
        downloadUrl,
        size: o.size,
        at: o.modified,
        processing: vm.state === "processing",
      };
    }),
  );
}

export async function deleteGuestVideo(id: string, name: string) {
  const p = guestPrefix(id);
  const vm = await getJson<GuestVideoMeta>(vmetaKey(id, name));
  if (vm?.streamUid) await streamDelete(vm.streamUid);
  for (const o of await listObjects(`${p}video/${name}.`).catch(() => [])) await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: o.key }));
  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: vmetaKey(id, name) })).catch(() => undefined);
}

export const guestCoverKey = (id: string) => `${guestPrefix(id)}cover.jpg`;
export async function guestCoverUrl(e: GuestEvent) {
  if (!e.cover) return null;
  return getSignedUrl(r2, new GetObjectCommand({ Bucket: BUCKET, Key: guestCoverKey(e.id) }), { expiresIn: 7200 }).catch(() => null);
}

export async function deleteGuestPhoto(id: string, name: string) {
  const p = guestPrefix(id);
  const origs = (await listObjects(`${p}original/${name}.`).catch(() => [])).map((o) => o.key);
  for (const Key of [`${p}web/${name}.jpg`, ...origs]) await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key }));
}
