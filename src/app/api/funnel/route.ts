import { NextResponse } from "next/server";
import { recordVisit, isStage, isSource, isMobileUA, isBotUA } from "@/lib/funnel";

export const runtime = "nodejs";

// Zapis etapu lejka (wejście na stronę, cennik, rejestracja) – bez cookies i danych osobowych
export async function POST(req: Request) {
  const ua = req.headers.get("user-agent");
  if (isBotUA(ua)) return new NextResponse(null, { status: 204 });
  const body = (await req.json().catch(() => null)) as { stage?: unknown; src?: unknown } | null;
  if (!body || !isStage(body.stage)) return new NextResponse(null, { status: 204 });
  const src = isSource(body.src) ? body.src : "other";
  await recordVisit(body.stage, src, isMobileUA(ua) ? "m" : "d").catch(() => undefined);
  return new NextResponse(null, { status: 204 });
}
