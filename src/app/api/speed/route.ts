import { NextResponse } from "next/server";
import { recordSpeed, isGroup } from "@/lib/speed";
import { isBotUA } from "@/lib/funnel";

export const runtime = "nodejs";

// Czas ładowania strony u odwiedzającego – bez cookies i danych osobowych
export async function POST(req: Request) {
  if (isBotUA(req.headers.get("user-agent"))) return new NextResponse(null, { status: 204 });
  const b = (await req.json().catch(() => null)) as { kind?: unknown; group?: unknown; ms?: unknown; ttfb?: unknown } | null;
  if (!b || (b.kind !== "load" && b.kind !== "nav") || !isGroup(b.group)) return new NextResponse(null, { status: 204 });
  await recordSpeed(b.kind, b.group, b.ms, b.ttfb).catch(() => undefined);
  return new NextResponse(null, { status: 204 });
}
