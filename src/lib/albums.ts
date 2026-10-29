import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { r2, BUCKET, galleryPrefix } from "@/lib/r2";
import type { AlbumProject } from "@/lib/album-layout";
import { ALBUM_SIZES, ALBUM_STYLES, ALBUM_BGS, ALBUM_FRAMES } from "@/lib/album-layout";

// Projektor albumów – abonament (miesiąc albo rok, z góry) i projekty zapisane przy galerii
export const ALBUM_PRICES: Record<number, number> = { 1: 29, 12: 290 };

// Testy: Projektor albumów widoczny tylko dla tych kont. Pusta lista = dla wszystkich.
const ALBUM_BETA = ["adamwojtczak7@gmail.com"];
export function albumAllowed(email?: string | null) {
  if (!ALBUM_BETA.length) return true;
  return Boolean(email && ALBUM_BETA.includes(email.toLowerCase()));
}

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

const subKey = (uid: string) => `profiles/${uid}/albums.json`;
const projectKey = (galleryId: string) => `${galleryPrefix(galleryId)}album.json`;

export async function getAlbumSub(uid: string): Promise<{ paidUntil?: string }> {
  return (await getJson<{ paidUntil?: string }>(subKey(uid))) ?? {};
}

export function albumActive(sub: { paidUntil?: string } | null) {
  return Boolean(sub?.paidUntil && new Date(sub.paidUntil).getTime() > Date.now());
}

export async function extendAlbumSub(uid: string, months: number) {
  const sub = await getAlbumSub(uid);
  const base = sub.paidUntil && new Date(sub.paidUntil) > new Date() ? new Date(sub.paidUntil) : new Date();
  base.setMonth(base.getMonth() + months);
  await putJson(subKey(uid), { paidUntil: base.toISOString() });
}

export async function getAlbumProject(galleryId: string) {
  return getJson<AlbumProject>(projectKey(galleryId));
}

// Zapis projektu z panelu – tylko znane pola i rozsądne rozmiary
export async function saveAlbumProject(galleryId: string, raw: unknown): Promise<boolean> {
  const p = raw as AlbumProject;
  if (!p || typeof p !== "object") return false;
  const size = typeof p.size === "number" ? `${p.size}x${p.size}` : p.size;
  if (!ALBUM_SIZES.includes(size) || !ALBUM_STYLES.includes(p.style) || !ALBUM_BGS.includes(p.bg)) return false;
  if (!Array.isArray(p.spreads) || p.spreads.length > 200) return false;
  const num = (n: unknown) => typeof n === "number" && Number.isFinite(n);
  for (const s of p.spreads) {
    if (!s || (s.kind !== "photos" && s.kind !== "title") || !Array.isArray(s.slots) || s.slots.length > 8) return false;
    for (const sl of s.slots) {
      if (typeof sl.photo !== "string" || sl.photo.length > 200) return false;
      if (sl.layer !== undefined && !num(sl.layer)) return false;
      const f = sl.frame;
      if (!f || !num(f.x) || !num(f.y) || !num(f.w) || !num(f.h)) return false;
    }
  }
  const aspects: Record<string, number> = {};
  for (const [k, v] of Object.entries(p.aspects ?? {}).slice(0, 3000)) if (num(v)) aspects[k.slice(0, 200)] = v as number;
  const clean: AlbumProject = {
    size,
    style: p.style,
    bg: p.bg,
    frame: ALBUM_FRAMES.includes(p.frame as never) ? p.frame : "none",
    source: String(p.source ?? "all").slice(0, 80),
    title: String(p.title ?? "").slice(0, 120),
    subtitle: String(p.subtitle ?? "").slice(0, 120),
    titlePage: Boolean(p.titlePage),
    bleed: Boolean(p.bleed),
    pages: num(p.pages) && p.pages! >= 2 && p.pages! <= 400 ? Math.round(p.pages!) : null,
    spreads: p.spreads.map((s) => ({
      id: String(s.id).slice(0, 40),
      kind: s.kind,
      variant: num(s.variant) ? s.variant : 0,
      ...(typeof s.bgPhoto === "string" ? { bgPhoto: s.bgPhoto.slice(0, 200) } : {}),
      slots: s.slots.map((sl) => ({
        photo: sl.photo,
        frame: { x: sl.frame.x, y: sl.frame.y, w: sl.frame.w, h: sl.frame.h },
        ...(num(sl.fx) ? { fx: Math.min(1, Math.max(0, sl.fx!)) } : {}),
        ...(num(sl.fy) ? { fy: Math.min(1, Math.max(0, sl.fy!)) } : {}),
        ...(num(sl.layer) ? { layer: Math.min(20, Math.max(0, Math.round(sl.layer!))) } : {}),
        ...(num(sl.zoom) ? { zoom: Math.min(4, Math.max(1, sl.zoom!)) } : {}),
      })),
    })),
    aspects,
    seed: num(p.seed) ? p.seed : 1,
    updatedAt: new Date().toISOString(),
  };
  await putJson(projectKey(galleryId), clean);
  return true;
}
