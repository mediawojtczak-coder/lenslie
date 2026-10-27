import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getMeta, saveMeta } from "@/lib/galleries";
import { requireOwner } from "@/lib/owner";

export const runtime = "nodejs";

// Link dla gości: włączenie, wybór sekcji, pobieranie i nowy link (stary przestaje działać)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const denied = await requireOwner(id);
  if (denied) return denied;

  const body = (await req.json().catch(() => null)) as
    | { enabled?: boolean; sections?: string[]; downloads?: string; newLink?: boolean }
    | null;
  const meta = await getMeta(id);
  if (!body || !meta) return NextResponse.json({ error: "Nieprawidłowe dane." }, { status: 400 });

  const known = new Set((meta.sections ?? []).map((s) => s.id));
  const current = meta.guest;
  meta.guest = {
    enabled: body.enabled ?? current?.enabled ?? false,
    token: !current?.token || body.newLink ? randomBytes(9).toString("base64url") : current.token,
    sections: Array.isArray(body.sections) ? body.sections.map(String).filter((s) => known.has(s)) : (current?.sections ?? []),
    downloads: body.downloads === "web" ? "web" : body.downloads === "none" ? "none" : (current?.downloads ?? "web"),
  };
  await saveMeta(id, meta);
  return NextResponse.json({ ok: true, guest: meta.guest });
}
