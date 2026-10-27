import { NextResponse } from "next/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { r2, BUCKET, isValidGalleryId, galleryPrefix } from "@/lib/r2";
import { listKeys } from "@/lib/photos";
import { getUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Usuwa całą galerię: wszystkie pliki w R2 i wpis w bazie
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Zaloguj się ponownie." }, { status: 401 });
  if (!isValidGalleryId(id)) return NextResponse.json({ error: "Nieprawidłowa galeria." }, { status: 400 });

  const { data: own } = await supabase.from("galleries").select("id").eq("id", id).maybeSingle();
  if (!own) return NextResponse.json({ error: "To nie jest Twoja galeria." }, { status: 403 });

  const keys = await listKeys(galleryPrefix(id));
  // Usuwamy po 10 plików naraz
  for (let i = 0; i < keys.length; i += 10) {
    await Promise.all(
      keys.slice(i, i + 10).map((Key) => r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key }))),
    );
  }
  await supabase.from("galleries").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
