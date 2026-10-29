import { GetObjectCommand, ListObjectsV2Command, PutObjectCommand } from "@aws-sdk/client-s3";
import { r2, BUCKET } from "@/lib/r2";
import { adminClient } from "@/lib/supabase/admin";
import { getMeta, saveMeta } from "@/lib/galleries";
import { getGalleryUsage } from "@/lib/photos";
import { addMonths } from "@/lib/plans";
import { proTier, proHardLimit, PRO_GRACE_DAYS, type ProTier, type ProTierId } from "@/lib/pro-plans";

export * from "@/lib/pro-plans";

// Abonament Pro fotografa: pro/<uid>.json (jedno miejsce, żeby codzienne zadanie łatwo znalazło wszystkie)
export type ProSub = {
  uid: string;
  tier: ProTierId;
  paidUntil: string;
  since: string;
  months?: 1 | 12; // ostatnio kupiony okres
  // Wysłane przypomnienia (dla danego paidUntil)
  notices?: { before?: string; ended?: string; grace?: string };
};

const DAY = 24 * 3600 * 1000;
const key = (uid: string) => `pro/${uid}.json`;

export async function getProSub(uid: string): Promise<ProSub | null> {
  try {
    const res = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key(uid) }));
    const text = await res.Body?.transformToString();
    return text ? (JSON.parse(text) as ProSub) : null;
  } catch {
    return null;
  }
}

export async function saveProSub(s: ProSub) {
  await r2.send(new PutObjectCommand({ Bucket: BUCKET, Key: key(s.uid), Body: JSON.stringify(s), ContentType: "application/json" }));
}

export async function listProSubs(): Promise<ProSub[]> {
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const res = await r2.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: "pro/", ContinuationToken: token }));
    for (const o of res.Contents ?? []) if (o.Key?.endsWith(".json")) keys.push(o.Key);
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  const subs = await Promise.all(keys.map((k) => getProSub(k.slice(4, -5))));
  return subs.filter((s): s is ProSub => Boolean(s));
}

// Opłacony okres trwa
export function proActive(s: ProSub | null): s is ProSub {
  return Boolean(s?.paidUntil && new Date(s.paidUntil).getTime() > Date.now());
}

// Koniec okresu łaski – do tej daty działają galerie w abonamencie
export function proGraceEnd(s: Pick<ProSub, "paidUntil">) {
  return new Date(new Date(s.paidUntil).getTime() + PRO_GRACE_DAYS * DAY);
}

export function proInGrace(s: ProSub | null): s is ProSub {
  return Boolean(s && !proActive(s) && proGraceEnd(s).getTime() > Date.now());
}

// Aktywny abonament fotografa (albo null) – do odblokowania dodatków
export async function activePro(uid: string | null | undefined): Promise<ProSub | null> {
  if (!uid) return null;
  const s = await getProSub(uid).catch(() => null);
  return proActive(s) ? s : null;
}

// Po opłaceniu: przedłużenie o miesiąc/rok (ten sam albo inny pakiet) albo zmiana na większy bez zmiany daty
export async function applyPro(uid: string, tier: ProTierId, months: number, upgrade = false) {
  const now = new Date();
  const cur = await getProSub(uid);
  let sub: ProSub;
  if (upgrade) {
    // zmiana pakietu nie przesuwa daty (także gdy płatność dotarła po końcu okresu)
    if (!cur) return null;
    sub = { ...cur, tier };
  } else {
    const base = cur && proActive(cur) ? new Date(cur.paidUntil) : now;
    sub = {
      uid,
      tier,
      since: cur?.since ?? now.toISOString(),
      paidUntil: addMonths(base, months).toISOString(),
      months: months === 12 ? 12 : 1,
    };
  }
  await saveProSub(sub);
  await syncPro(uid, sub);
  return sub;
}

// Galerie fotografa (id) z bazy
async function ownedGalleryIds(uid: string): Promise<string[]> {
  const db = adminClient();
  if (!db) return [];
  const { data } = await db.from("galleries").select("id").eq("owner_id", uid);
  return ((data ?? []) as { id: string }[]).map((g) => g.id);
}

export async function galleryOwnerId(id: string): Promise<string | null> {
  const db = adminClient();
  if (!db) return null;
  const { data } = await db.from("galleries").select("owner_id").eq("id", id).maybeSingle();
  return (data as { owner_id: string | null } | null)?.owner_id ?? null;
}

// Galerie w abonamencie dostępne do końca okresu łaski; dodatki z datą (strona, domena) – też
export async function syncPro(uid: string, sub: ProSub) {
  const until = proGraceEnd(sub).toISOString();
  for (const id of await ownedGalleryIds(uid)) {
    const meta = await getMeta(id).catch(() => null);
    if (meta?.plan !== "pro") continue;
    if (meta.expiresAt !== until) {
      meta.expiresAt = until;
      meta.notices = undefined;
      await saveMeta(id, meta);
    }
  }
  const { getSite, saveSite } = await import("@/lib/portfolio");
  const site = await getSite(uid).catch(() => null);
  if (site?.slug && (!site.paidUntil || site.paidUntil < until)) await saveSite({ ...site, paidUntil: until });
  const { getDomainByUser, saveDomain, vercelAddDomain } = await import("@/lib/domains");
  const dom = await getDomainByUser(uid).catch(() => null);
  if (dom && dom.paidUntil < until) {
    const wasOff = new Date(dom.paidUntil).getTime() < Date.now();
    await saveDomain({ ...dom, paidUntil: until, reminded: false, detached: false });
    if (wasOff) await vercelAddDomain(dom.host).catch(() => undefined);
  }
}

// Zajęte miejsce z puli: galerie w abonamencie i wersje robocze (zdjęcia + filmy)
export async function proUsage(uid: string): Promise<{ bytes: number; galleries: number }> {
  let bytes = 0;
  let galleries = 0;
  const ids = await ownedGalleryIds(uid);
  await Promise.all(
    ids.map(async (id) => {
      const meta = await getMeta(id).catch(() => null);
      if (!meta || (meta.plan && meta.plan !== "pro")) return;
      galleries += meta.plan === "pro" ? 1 : 0;
      bytes += await getGalleryUsage(id).catch(() => 0);
      bytes += (meta.videos ?? []).filter((v) => v.status !== "error").reduce((s, v) => s + (v.size || 0), 0);
    }),
  );
  return { bytes, galleries };
}

// Zajęte miejsce zapamiętane na 10 minut (liczenie przegląda wszystkie galerie) – przy wgrywaniu doliczamy nowe pliki
const usageKey = (uid: string) => `pro-usage/${uid}.json`;
const USAGE_TTL = 10 * 60 * 1000;
type CachedUsage = { bytes: number; at: string };

async function cachedUsage(uid: string): Promise<number> {
  try {
    const res = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: usageKey(uid) }));
    const c = JSON.parse((await res.Body?.transformToString()) ?? "null") as CachedUsage | null;
    if (c && Date.now() - new Date(c.at).getTime() < USAGE_TTL) return c.bytes;
  } catch {}
  const { bytes } = await proUsage(uid);
  await saveUsage(uid, { bytes, at: new Date().toISOString() });
  return bytes;
}

const saveUsage = (uid: string, c: CachedUsage) =>
  r2.send(new PutObjectCommand({ Bucket: BUCKET, Key: usageKey(uid), Body: JSON.stringify(c), ContentType: "application/json" })).catch(() => undefined);

// Czy dodatkowe bajty zmieszczą się w puli abonamentu (reserve: od razu dolicz je do zapamiętanego wyniku)
export async function proFits(uid: string, sub: ProSub, extra: number, reserve = true): Promise<{ ok: boolean; used: number; tier: ProTier }> {
  const tier = proTier(sub.tier)!;
  const used = await cachedUsage(uid);
  const ok = used + extra <= proHardLimit(tier);
  if (ok && reserve && extra > 0) {
    // „at” zostaje ze starego wyniku, żeby po 10 minutach i tak policzyć wszystko od nowa
    try {
      const res = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: usageKey(uid) }));
      const c = JSON.parse((await res.Body?.transformToString()) ?? "null") as CachedUsage | null;
      if (c) await saveUsage(uid, { bytes: c.bytes + extra, at: c.at });
    } catch {}
  }
  return { ok, used, tier };
}
