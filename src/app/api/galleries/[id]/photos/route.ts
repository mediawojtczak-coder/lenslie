import { NextResponse } from "next/server";
import { E } from "@/lib/api-lang";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { r2, BUCKET, isValidGalleryId, galleryPrefix, baseName } from "@/lib/r2";
import { listKeys } from "@/lib/photos";
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

  const prefix = galleryPrefix(id);
  const keys = (await listKeys(prefix)).filter((key) => {
    const rest = key.slice(prefix.length);
    if (!rest.startsWith("web/") && !rest.startsWith("original/") && !rest.startsWith("wm/")) return false;
    return names.has(baseName(rest.split("/").pop() ?? ""));
  });

  // Usuwamy po 10 plików naraz
  for (let i = 0; i < keys.length; i += 10) {
    await Promise.all(
      keys.slice(i, i + 10).map((Key) => r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key }))),
    );
  }
  return NextResponse.json({ ok: true, deleted: keys.length });
}
