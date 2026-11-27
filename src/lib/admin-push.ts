import webpush from "web-push";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { r2, BUCKET } from "@/lib/r2";

// Powiadomienia push na telefon/komputer – TYLKO dla administratora (nowi fotografowie, sprzedaż).
// Klucze VAPID i lista urządzeń leżą w prywatnym R2 (bez zmiennych środowiskowych).
const KEY = "system/admin-push.json";

export type PushSub = { endpoint: string; keys: { p256dh: string; auth: string }; label?: string; added?: string };
type Store = { publicKey: string; privateKey: string; subs: PushSub[] };

async function load(): Promise<Store | null> {
  try {
    const res = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: KEY }));
    return JSON.parse((await res.Body?.transformToString()) ?? "null") as Store | null;
  } catch {
    return null;
  }
}
async function save(s: Store) {
  await r2.send(new PutObjectCommand({ Bucket: BUCKET, Key: KEY, Body: JSON.stringify(s), ContentType: "application/json" }));
}
async function store(): Promise<Store> {
  const s = await load();
  if (s?.publicKey && s.privateKey) return { ...s, subs: s.subs ?? [] };
  const k = webpush.generateVAPIDKeys();
  const fresh: Store = { publicKey: k.publicKey, privateKey: k.privateKey, subs: [] };
  await save(fresh);
  return fresh;
}

export async function pushPublicKey() {
  return (await store()).publicKey;
}
export async function pushDevices() {
  return (await load())?.subs ?? [];
}
export async function addPushSub(sub: PushSub) {
  const s = await store();
  s.subs = [...s.subs.filter((x) => x.endpoint !== sub.endpoint), { ...sub, added: new Date().toISOString() }];
  await save(s);
}
export async function removePushSub(endpoint: string) {
  const s = await load();
  if (!s) return;
  s.subs = (s.subs ?? []).filter((x) => x.endpoint !== endpoint);
  await save(s);
}

// Wysyła powiadomienie na wszystkie urządzenia administratora. Nigdy nie rzuca błędem.
export async function pushAdmins(title: string, body: string, url = "/admin") {
  try {
    const s = await load();
    if (!s?.subs?.length) return;
    const payload = JSON.stringify({ title, body, url });
    const dead: string[] = [];
    await Promise.all(
      s.subs.map((sub) =>
        webpush
          .sendNotification(sub, payload, {
            vapidDetails: { subject: "mailto:mediawojtczak@gmail.com", publicKey: s.publicKey, privateKey: s.privateKey },
            TTL: 24 * 3600,
            urgency: "high",
          })
          .catch((e: { statusCode?: number }) => {
            if (e?.statusCode === 404 || e?.statusCode === 410) dead.push(sub.endpoint);
            else console.error("Push:", e);
          }),
      ),
    );
    if (dead.length) {
      s.subs = s.subs.filter((x) => !dead.includes(x.endpoint));
      await save(s);
    }
  } catch (e) {
    console.error("Push:", e);
  }
}
