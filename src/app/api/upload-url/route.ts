import { NextResponse } from "next/server";
import { E } from "@/lib/api-lang";
import { getLang } from "@/lib/lang-server";
import { isValidGalleryId } from "@/lib/r2";
import { getUser } from "@/lib/supabase/server";
import { prepareUploads, type FileInfo } from "@/lib/uploads";

export const runtime = "nodejs";

// Zwraca podpisane linki, pod które przeglądarka wgrywa zdjęcia bezpośrednio do R2.
export async function POST(req: Request) {
  const { supabase, user } = await getUser();
  if (!user) {
    return NextResponse.json({ error: await E("Zaloguj się ponownie.") }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | { gallery?: string; files?: FileInfo[] }
    | null;
  if (!body) {
    return NextResponse.json({ error: await E("Nieprawidłowe dane.") }, { status: 400 });
  }

  const gallery = String(body.gallery ?? "");
  if (!isValidGalleryId(gallery)) {
    return NextResponse.json(
      { error: await E("Adres galerii może zawierać tylko małe litery, cyfry i myślniki.") },
      { status: 400 },
    );
  }

  // Wgrywać można tylko do własnej galerii
  const { data: own } = await supabase.from("galleries").select("id").eq("id", gallery).maybeSingle();
  if (!own) {
    return NextResponse.json({ error: await E("To nie jest Twoja galeria.") }, { status: 403 });
  }

  const files = Array.isArray(body.files) ? body.files.slice(0, 50) : [];
  if (files.length === 0) {
    return NextResponse.json({ error: await E("Nie wybrano żadnych zdjęć.") }, { status: 400 });
  }

  const res = await prepareUploads(gallery, files, await getLang());
  if (!res.ok) return NextResponse.json({ error: res.error, code: res.code }, { status: res.status });
  return NextResponse.json({
    gallery,
    uploads: res.uploads.map(({ name, type, originalUrl, webUrl, wmUrl }) => ({ name, type, originalUrl, webUrl, wmUrl })),
    watermark: res.watermark,
  });
}
