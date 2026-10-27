import { NextResponse } from "next/server";
import { isValidGalleryId, galleryPrefix } from "@/lib/r2";
import { listKeys } from "@/lib/photos";
import { getMeta, saveMeta } from "@/lib/galleries";
import { getUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Ustawia zdjęcie główne (okładkę) galerii fotografa
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Zaloguj się ponownie." }, { status: 401 });
  if (!isValidGalleryId(id)) return NextResponse.json({ error: "Nieprawidłowa galeria." }, { status: 400 });

  const { data: own } = await supabase.from("galleries").select("id").eq("id", id).maybeSingle();
  if (!own) return NextResponse.json({ error: "To nie jest Twoja galeria." }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { name?: string } | null;
  const name = String(body?.name ?? "");
  const keys = await listKeys(`${galleryPrefix(id)}web/`);
  if (!name || !keys.includes(`${galleryPrefix(id)}web/${name}.jpg`)) {
    return NextResponse.json({ error: "Nie znaleziono tego zdjęcia." }, { status: 404 });
  }

  const meta = await getMeta(id);
  if (!meta) return NextResponse.json({ error: "Nie znaleziono galerii." }, { status: 404 });
  meta.cover = name;
  await saveMeta(id, meta);
  return NextResponse.json({ ok: true });
}
