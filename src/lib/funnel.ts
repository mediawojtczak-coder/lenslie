import { randomBytes } from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2, BUCKET } from "@/lib/r2";
import { listObjects } from "@/lib/photos";

// Lejek odwiedzin strony Lenslie – bez cookies i danych osobowych.
// Każde zdarzenie to pusty plik w R2: funnel/<RRRR-MM-DD>/<etap>.<źródło>.<urządzenie>.<los>
// (dane są w samej nazwie – licznik czyta tylko listę plików).

export const VISIT_STAGES = ["visit", "pricing", "signup"] as const;
export type VisitStage = (typeof VISIT_STAGES)[number];
export const SOURCES = ["google", "facebook", "other"] as const;
export type FunnelSource = (typeof SOURCES)[number];
export type Device = "m" | "d";

export const isStage = (v: unknown): v is VisitStage => VISIT_STAGES.includes(v as VisitStage);
export const isSource = (v: unknown): v is FunnelSource => SOURCES.includes(v as FunnelSource);

export async function recordVisit(stage: VisitStage, src: FunnelSource, dev: Device) {
  const day = new Date().toISOString().slice(0, 10);
  const Key = `funnel/${day}/${stage}.${src}.${dev}.${randomBytes(5).toString("hex")}`;
  await r2.send(new PutObjectCommand({ Bucket: BUCKET, Key, Body: "", ContentType: "text/plain" }));
}

// Segmenty kolumn w panelu
export type Segment = "all" | "google" | "facebook" | "m" | "d";
export const SEGMENTS: Segment[] = ["all", "google", "facebook", "m", "d"];
export type Counts = Record<Segment, number>;
export const emptyCounts = (): Counts => ({ all: 0, google: 0, facebook: 0, m: 0, d: 0 });

export function addTo(c: Counts, src: string | undefined, dev: string | undefined) {
  c.all += 1;
  if (src === "google") c.google += 1;
  if (src === "facebook") c.facebook += 1;
  if (dev === "m") c.m += 1;
  if (dev === "d") c.d += 1;
}

// Zliczenia odwiedzin z ostatnich `days` dni + data pierwszego zapisu (od kiedy liczymy)
export async function visitCounts(days = 30): Promise<{ counts: Record<VisitStage, Counts>; since: string | null }> {
  const counts = Object.fromEntries(VISIT_STAGES.map((s) => [s, emptyCounts()])) as Record<VisitStage, Counts>;
  const from = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString().slice(0, 10);
  let since: string | null = null;
  for (const o of await listObjects("funnel/").catch(() => [])) {
    const [, day, name] = o.key.split("/");
    if (!day || !name) continue;
    if (!since || day < since) since = day;
    if (day < from) continue;
    const [stage, src, dev] = name.split(".");
    if (isStage(stage)) addTo(counts[stage], src, dev);
  }
  return { counts, since };
}

// Źródło konta fotografa na podstawie zapisanego źródła rejestracji
export function sourceKind(label: string | undefined, t?: { g?: 1; f?: 1; s?: string }): FunnelSource {
  if (t?.g || label === "Reklama Google") return "google";
  if (t?.f || /facebook|instagram/i.test(label ?? "") || /facebook|instagram|fb|ig|meta/i.test(t?.s ?? "")) return "facebook";
  return "other";
}

export const isMobileUA = (ua: string | null | undefined) => /Mobi|Android|iPhone|iPod/i.test(ua ?? "");
export const isBotUA = (ua: string | null | undefined) =>
  !ua || /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|pingdom|monitor|curl|wget|python|axios/i.test(ua);
