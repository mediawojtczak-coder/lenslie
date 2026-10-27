import { cookies, headers } from "next/headers";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { r2, BUCKET } from "@/lib/r2";
import { LANG_COOKIE, isSiteLang, type SiteLang } from "@/lib/lang";

// Język z ciasteczka, a przy pierwszej wizycie – z ustawień przeglądarki (polski dla polskich przeglądarek, inaczej angielski)
export async function getLang(): Promise<SiteLang> {
  const store = await cookies();
  const c = store.get(LANG_COOKIE)?.value;
  if (isSiteLang(c)) return c;
  const accept = ((await headers()).get("accept-language") ?? "").toLowerCase();
  if (!accept) return "pl";
  return accept.startsWith("pl") || /(^|,)\s*pl/.test(accept.split(";")[0]) ? "pl" : "en";
}

// Język fotografa do maili (zapisywany przy zmianie języka i przy rejestracji)
const key = (uid: string) => `profiles/${uid}/lang.json`;
export async function getUserLang(uid: string): Promise<SiteLang> {
  try {
    const res = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key(uid) }));
    const v = JSON.parse((await res.Body?.transformToString()) ?? "{}").lang;
    return isSiteLang(v) ? v : "pl";
  } catch {
    return "pl";
  }
}
export async function setUserLang(uid: string, lang: SiteLang) {
  await r2.send(new PutObjectCommand({ Bucket: BUCKET, Key: key(uid), Body: JSON.stringify({ lang }), ContentType: "application/json" }));
}
