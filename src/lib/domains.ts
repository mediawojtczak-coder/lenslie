import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { r2, BUCKET } from "@/lib/r2";

// Własna domena fotografa (np. galerie.annanowak.pl) – płatny dodatek z salda
export const DOMAIN_PRICE = 99; // zł za rok
export const MAIN_HOSTS = ["lenslie.com", "www.lenslie.com", "lenslie.vercel.app", "localhost"];

// verified: DNS fotografa już wskazuje na Lenslie – dopiero wtedy linki w „Udostępnij” używają tej domeny
export type DomainRec = { host: string; uid: string; addedAt: string; paidUntil: string; reminded?: boolean; detached?: boolean; verified?: boolean };

const hostKey = (host: string) => `domains/hosts/${host}.json`;
const userKey = (uid: string) => `domains/users/${uid}.json`;

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

export const getDomainByHost = (host: string) => getJson<DomainRec>(hostKey(host.toLowerCase()));
export const getDomainByUser = (uid: string) => getJson<DomainRec>(userKey(uid));

export async function saveDomain(rec: DomainRec) {
  await putJson(hostKey(rec.host), rec);
  await putJson(userKey(rec.uid), rec);
}

export async function deleteDomain(rec: DomainRec) {
  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: hostKey(rec.host) }));
  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: userKey(rec.uid) }));
}

export const domainActive = (rec: DomainRec | null) => Boolean(rec && new Date(rec.paidUntil).getTime() > Date.now());

// Tylko subdomeny (CNAME), np. galerie.annanowak.pl
export function cleanHost(input: unknown): string | null {
  const h = String(input ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
  if (!/^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.){2,}[a-z]{2,}$/.test(h)) return null;
  if (h.endsWith("lenslie.com") || h.endsWith("vercel.app")) return null;
  return h;
}

// ---- Vercel API: przypięcie domeny do projektu i sprawdzenie DNS ----
export const vercelEnabled = () => Boolean(process.env.VERCEL_TOKEN);
const project = () => process.env.VERCEL_PROJECT ?? "lenslie";
const team = () => (process.env.VERCEL_TEAM ? `?slug=${encodeURIComponent(process.env.VERCEL_TEAM)}` : "");
const headers = () => ({ Authorization: `Bearer ${process.env.VERCEL_TOKEN}`, "Content-Type": "application/json" });

export async function vercelAddDomain(host: string): Promise<string | null> {
  const res = await fetch(`https://api.vercel.com/v10/projects/${project()}/domains${team()}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ name: host }),
  });
  if (res.ok) return null;
  const data = await res.json().catch(() => ({}));
  const code = data?.error?.code ?? "";
  if (code === "domain_already_in_use" || code === "domain_taken") return "Ta domena jest już używana w innym serwisie.";
  if (code === "domain_already_exists") return null;
  console.error("Vercel add domain:", res.status, JSON.stringify(data));
  return "Nie udało się podłączyć domeny. Spróbuj ponownie za chwilę.";
}

export async function vercelRemoveDomain(host: string) {
  await fetch(`https://api.vercel.com/v9/projects/${project()}/domains/${host}${team()}`, {
    method: "DELETE",
    headers: headers(),
  }).catch(() => undefined);
}

// Stan konfiguracji: czy DNS już wskazuje na nas i jaki CNAME ustawić
export async function vercelDomainStatus(host: string): Promise<{ configured: boolean; cname: string }> {
  const fallback = "cname.vercel-dns.com";
  try {
    const res = await fetch(`https://api.vercel.com/v6/domains/${host}/config${team()}`, { headers: headers(), cache: "no-store" });
    const data = await res.json();
    const rec = data?.recommendedCNAME?.[0]?.value as string | undefined;
    return { configured: data?.misconfigured === false, cname: (rec ?? fallback).replace(/\.$/, "") };
  } catch {
    return { configured: false, cname: fallback };
  }
}
