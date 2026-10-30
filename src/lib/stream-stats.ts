import { accountId } from "@/lib/videos";

// Statystyki oglądania filmów z Cloudflare Stream (GraphQL Analytics API) – tylko dla panelu administratora.
// Wymaga tokenu z uprawnieniem „Account Analytics: Read” (zmienna CLOUDFLARE_ANALYTICS_TOKEN;
// jeśli jej nie ma, próbujemy tokenem Stream). Cloudflare trzyma te dane 92 dni, jedno zapytanie obejmuje max 32 dni.

export type StreamStats = { ok: true; d30: Map<string, number>; d90: Map<string, number> } | { ok: false; error: string };

const QUERY = `query ($acc: string!, $start: Date!, $end: Date!) {
  viewer {
    accounts(filter: { accountTag: $acc }) {
      streamMinutesViewedAdaptiveGroups(filter: { date_geq: $start, date_lt: $end }, orderBy: [sum_minutesViewed_DESC], limit: 1000) {
        sum { minutesViewed }
        dimensions { uid }
      }
    }
  }
}`;

const day = (d: Date) => d.toISOString().slice(0, 10);

async function window(token: string, acc: string, start: Date, end: Date): Promise<Map<string, number>> {
  const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: QUERY, variables: { acc, start: day(start), end: day(end) } }),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as {
    data?: { viewer?: { accounts?: { streamMinutesViewedAdaptiveGroups?: { sum: { minutesViewed: number }; dimensions: { uid: string } }[] }[] } };
    errors?: { message: string }[] | null;
  };
  if (!res.ok || data.errors?.length) throw new Error(data.errors?.map((e) => e.message).join("; ") || `HTTP ${res.status}`);
  const out = new Map<string, number>();
  for (const g of data.data?.viewer?.accounts?.[0]?.streamMinutesViewedAdaptiveGroups ?? []) {
    out.set(g.dimensions.uid, (out.get(g.dimensions.uid) ?? 0) + (g.sum.minutesViewed || 0));
  }
  return out;
}

export async function getStreamStats(): Promise<StreamStats> {
  const token = process.env.CLOUDFLARE_ANALYTICS_TOKEN || process.env.CLOUDFLARE_STREAM_TOKEN;
  const acc = accountId();
  if (!token || !acc) return { ok: false, error: "Brak tokenu Cloudflare albo identyfikatora konta." };
  const DAY = 24 * 3600 * 1000;
  const end = new Date(Date.now() + DAY); // do jutra – obejmuje dzisiejszy dzień
  try {
    // 90 dni w trzech oknach po 30 dni (limit Cloudflare: 32 dni na zapytanie)
    const wins = await Promise.all(
      [0, 1, 2].map((i) => window(token, acc, new Date(end.getTime() - (i + 1) * 30 * DAY), new Date(end.getTime() - i * 30 * DAY))),
    );
    const d90 = new Map<string, number>();
    for (const w of wins) for (const [uid, m] of w) d90.set(uid, (d90.get(uid) ?? 0) + m);
    return { ok: true, d30: wins[0], d90 };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
