import { randomBytes } from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2, BUCKET } from "@/lib/r2";
import { listObjects } from "@/lib/photos";

// Pomiar szybkości stron u prawdziwych odwiedzających – bez cookies i danych osobowych.
// Zapis: pusty plik speed/<RRRR-MM-DD>/<rodzaj>.<strona>.<ms>.<ttfb>.<los>
// rodzaj: load = pierwsze wejście (pełne załadowanie), nav = przejście między stronami w panelu / na stronie

import { SPEED_GROUPS, isGroup, type SpeedGroup, type SpeedKind } from "@/lib/speed-groups";
export * from "@/lib/speed-groups";

const clampMs = (n: unknown) => Math.max(0, Math.min(120_000, Math.round(Number(n) || 0)));

export async function recordSpeed(kind: SpeedKind, group: SpeedGroup, ms: unknown, ttfb: unknown) {
  const day = new Date().toISOString().slice(0, 10);
  const Key = `speed/${day}/${kind}.${group}.${clampMs(ms)}.${clampMs(ttfb)}.${randomBytes(4).toString("hex")}`;
  await r2.send(new PutObjectCommand({ Bucket: BUCKET, Key, Body: "", ContentType: "text/plain" }));
}

export type SpeedRow = { group: SpeedGroup; label: string; load: Stat; nav: Stat; ttfb: Stat };
export type Stat = { n: number; median: number | null; p75: number | null };

function stat(values: number[]): Stat {
  if (!values.length) return { n: 0, median: null, p75: null };
  const v = [...values].sort((a, b) => a - b);
  const q = (p: number) => v[Math.min(v.length - 1, Math.floor(p * (v.length - 1) + 0.5))];
  return { n: v.length, median: q(0.5), p75: q(0.75) };
}

// Statystyki z dni [fromDaysAgo, toDaysAgo) – np. (7, 0) = ostatnie 7 dni, (14, 7) = tydzień wcześniej
export function speedFrom(keys: string[], fromDaysAgo: number, toDaysAgo: number): SpeedRow[] {
  const day = (d: number) => new Date(Date.now() - d * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const from = day(fromDaysAgo);
  const to = day(toDaysAgo);
  const acc = new Map<SpeedGroup, { load: number[]; nav: number[]; ttfb: number[] }>();
  for (const k of keys) {
    const [, d, name] = k.split("/");
    if (!d || !name || d < from || (toDaysAgo > 0 && d >= to)) continue;
    const [kind, group, ms, ttfb] = name.split(".");
    if (!isGroup(group)) continue;
    const a = acc.get(group) ?? { load: [], nav: [], ttfb: [] };
    if (kind === "load") {
      a.load.push(Number(ms));
      if (Number(ttfb) > 0) a.ttfb.push(Number(ttfb));
    } else if (kind === "nav") a.nav.push(Number(ms));
    acc.set(group, a);
  }
  return (Object.keys(SPEED_GROUPS) as SpeedGroup[])
    .filter((g) => acc.has(g))
    .map((g) => {
      const a = acc.get(g)!;
      return { group: g, label: SPEED_GROUPS[g], load: stat(a.load), nav: stat(a.nav), ttfb: stat(a.ttfb) };
    });
}

export async function speedKeys(): Promise<string[]> {
  const from = new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  return (await listObjects("speed/").catch(() => [])).map((o) => o.key).filter((k) => (k.split("/")[1] ?? "") >= from);
}

// Ocena: dobra / do poprawy / wolna (próg dla 75% wizyt – jak w Google Core Web Vitals dla ładowania)
export function grade(ms: number | null, kind: SpeedKind): "dobra" | "do poprawy" | "wolna" | "–" {
  if (ms === null) return "–";
  const [good, ok] = kind === "nav" ? [1000, 2500] : [2500, 4000];
  return ms <= good ? "dobra" : ms <= ok ? "do poprawy" : "wolna";
}

export const fmtMs = (ms: number | null) => (ms === null ? "–" : ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1).replace(".", ",")} s`);

// Tekst raportu tygodniowego (mail dla administratora)
export function speedReport(now: SpeedRow[], prev: SpeedRow[]): string[] {
  if (!now.length) return ["Brak pomiarów w tym tygodniu."];
  const prevOf = (g: SpeedGroup) => prev.find((r) => r.group === g);
  const lines = now.map((r) => {
    const p = prevOf(r.group);
    const parts: string[] = [];
    if (r.load.n) {
      const change = p?.load.p75 && r.load.p75 ? Math.round(((r.load.p75 - p.load.p75) / p.load.p75) * 100) : null;
      parts.push(`wejście ${fmtMs(r.load.p75)} (${grade(r.load.p75, "load")}${change !== null ? `, ${change > 0 ? "+" : ""}${change}% wobec poprzedniego tygodnia` : ""})`);
    }
    if (r.nav.n) parts.push(`przejście ${fmtMs(r.nav.p75)} (${grade(r.nav.p75, "nav")})`);
    if (r.ttfb.n) parts.push(`odpowiedź serwera ${fmtMs(r.ttfb.p75)}`);
    return `${r.label}: ${parts.join(", ")} – ${r.load.n + r.nav.n} pomiarów.`;
  });
  const slow = now.filter((r) => grade(r.load.p75, "load") === "wolna" || grade(r.nav.p75, "nav") === "wolna");
  const worse = now.filter((r) => {
    const p = prevOf(r.group);
    return p?.load.p75 && r.load.p75 && r.load.p75 > p.load.p75 * 1.3 && r.load.n >= 5;
  });
  return [
    ...(slow.length ? [`Wolne: ${slow.map((r) => r.label).join(", ")}. Warto to poprawić.`] : ["Żadna strona nie jest wolna."]),
    ...(worse.length ? [`Wolniej niż tydzień temu (o ponad 30%): ${worse.map((r) => r.label).join(", ")}.`] : []),
    ...lines,
    "Czasy to wartość, w której mieści się 75% wizyt. Szczegóły: panel administratora → Szybkość stron.",
  ];
}
