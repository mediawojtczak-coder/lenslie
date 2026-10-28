import { NextResponse } from "next/server";
import { E } from "@/lib/api-lang";
import { isValidGalleryId } from "@/lib/r2";
import { deletePhotos } from "@/lib/uploads";
import { getUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Usuwa wybrane zdjęcia (oryginał i wersję do oglądania) z galerii fotografa
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: await E("Zaloguj się ponownie.") }, { status: 401 });
  if (!isValidGalleryId(id)) return NextResponse.json({ error: await E("Nieprawidłowa galeria.") }, { status: 400 });

  const { data: own } = await supabase.from("galleries").select("id").eq("id", id).maybeSingle();
  if (!own) return NextResponse.json({ error: await E("To nie jest Twoja galeria.") }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { names?: string[] } | null;
  const names = new Set((body?.names ?? []).map(String));
  if (names.size === 0) return NextResponse.json({ error: await E("Nie wybrano zdjęć.") }, { status: 400 });

  const deleted = await deletePhotos(id, names);
  return NextResponse.json({ ok: true, deleted });
}
