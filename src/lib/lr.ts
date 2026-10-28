import { createHash, randomBytes } from "crypto";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { r2, BUCKET, isValidGalleryId } from "@/lib/r2";
import { adminClient } from "@/lib/supabase/admin";

// Wtyczka Lightroom Classic: fotograf loguje się raz e-mailem i hasłem, wtyczka dostaje własny klucz (token).
// Przechowujemy tylko skrót klucza: lr-tokens/<sha256>.json -> { uid }, a listę kluczy konta w profiles/<uid>/lr.json.
export const LR_PLUGIN_VERSION = "1.0.0";
const MAX_TOKENS = 5;

type TokenRec = { uid: string; createdAt: string; device?: string };
type UserTokens = { tokens: { hash: string; createdAt: string; device?: string; lastUsed?: string }[] };

const sha = (t: string) => createHash("sha256").update(t).digest("hex");
const tokenKey = (hash: string) => `lr-tokens/${hash}.json`;
const userKey = (uid: string) => `profiles/${uid}/lr.json`;

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

export async function issueToken(uid: string, device?: string) {
  const token = `lr_${randomBytes(24).toString("hex")}`;
  const hash = sha(token);
  const createdAt = new Date().toISOString();
  await putJson(tokenKey(hash), { uid, createdAt, device } satisfies TokenRec);
  const list = (await getJson<UserTokens>(userKey(uid))) ?? { tokens: [] };
  list.tokens.unshift({ hash, createdAt, device });
  // Najstarsze klucze (np. stary komputer) wygasają, gdy jest ich za dużo
  for (const old of list.tokens.splice(MAX_TOKENS)) {
    await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: tokenKey(old.hash) })).catch(() => undefined);
  }
  await putJson(userKey(uid), list);
  return token;
}

export async function listTokens(uid: string) {
  return ((await getJson<UserTokens>(userKey(uid))) ?? { tokens: [] }).tokens;
}

// Wylogowuje wtyczkę na wszystkich komputerach
export async function revokeAll(uid: string) {
  const list = (await getJson<UserTokens>(userKey(uid))) ?? { tokens: [] };
  for (const t of list.tokens) await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: tokenKey(t.hash) })).catch(() => undefined);
  await putJson(userKey(uid), { tokens: [] });
}

export type LrUser = { uid: string; email: string; lang: "pl" | "en" };

// Fotograf z nagłówka Authorization: Bearer lr_…
export async function lrUser(req: Request): Promise<LrUser | null> {
  const m = /^Bearer\s+(lr_[a-f0-9]{48})$/.exec(req.headers.get("authorization") ?? "");
  if (!m) return null;
  const rec = await getJson<TokenRec>(tokenKey(sha(m[1])));
  if (!rec) return null;
  const db = adminClient();
  if (!db) return null;
  const { data } = await db.auth.admin.getUserById(rec.uid);
  if (!data?.user?.email) return null;
  const lang = req.headers.get("accept-language")?.toLowerCase().startsWith("en") ? "en" : "pl";
  return { uid: rec.uid, email: data.user.email, lang };
}

// Czy galeria należy do fotografa
export async function ownsGallery(uid: string, id: string) {
  if (!isValidGalleryId(id)) return false;
  const db = adminClient();
  if (!db) return false;
  const { data } = await db.from("galleries").select("id").eq("id", id).eq("owner_id", uid).maybeSingle();
  return Boolean(data);
}

export function lrError(lang: "pl" | "en", pl: string, en: string, status = 400) {
  return Response.json({ error: lang === "en" ? en : pl }, { status });
}
