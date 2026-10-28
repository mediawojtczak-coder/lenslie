import { NextResponse } from "next/server";
import { E } from "@/lib/api-lang";
import { requireOwner } from "@/lib/owner";
import { getMeta, saveMeta } from "@/lib/galleries";

export const runtime = "nodejs";

// Fotograf włącza/wyłącza samodzielne przedłużanie galerii przez klienta
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const denied = await requireOwner(id);
  if (denied) return denied;
  const body = (await req.json().catch(() => null)) as { on?: boolean } | null;
  const meta = await getMeta(id);
  if (!meta || typeof body?.on !== "boolean") return NextResponse.json({ error: await E("Nieprawidłowe dane.") }, { status: 400 });
  meta.clientExtend = body.on;
  await saveMeta(id, meta);
  return NextResponse.json({ ok: true });
}
