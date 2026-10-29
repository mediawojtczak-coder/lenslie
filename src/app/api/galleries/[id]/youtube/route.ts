import { NextResponse } from "next/server";
import { E } from "@/lib/api-lang";
import { requireOwner } from "@/lib/owner";
import { getUser } from "@/lib/supabase/server";
import { getMeta, saveMeta } from "@/lib/galleries";
import { ytAllowed, ytId, YT_MAX, type YtLink } from "@/lib/youtube";

export const runtime = "nodejs";

// Filmy z YouTube w galerii: włącznik i lista linków
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const denied = await requireOwner(id);
  if (denied) return denied;
  const { user } = await getUser();
  if (!ytAllowed(user?.email)) return NextResponse.json({ error: await E("Nieprawidłowe dane.") }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { enabled?: boolean; links?: unknown } | null;
  const meta = await getMeta(id);
  if (!meta || typeof body?.enabled !== "boolean" || !Array.isArray(body.links)) {
    return NextResponse.json({ error: await E("Nieprawidłowe dane.") }, { status: 400 });
  }
  const links: YtLink[] = [];
  const bad: string[] = [];
  for (const raw of body.links.slice(0, YT_MAX)) {
    const url = String(raw ?? "").trim().slice(0, 300);
    if (!url) continue;
    const vid = ytId(url);
    if (!vid) bad.push(url);
    else if (!links.some((l) => l.id === vid)) links.push({ url, id: vid });
  }
  if (bad.length) {
    return NextResponse.json({ error: `To nie wygląda na link do filmu z YouTube: ${bad[0]}`, bad }, { status: 400 });
  }
  meta.youtube = { enabled: body.enabled, links };
  await saveMeta(id, meta);
  return NextResponse.json({ ok: true, links });
}
