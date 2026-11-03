import { NextResponse } from "next/server";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { E } from "@/lib/api-lang";
import { r2, BUCKET, isValidGalleryId, galleryPrefix } from "@/lib/r2";
import { listKeys, customCoverKey } from "@/lib/photos";
import { getMeta, saveMeta } from "@/lib/galleries";
import { getUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Okładka galerii: zdjęcie z galerii (gwiazdka) albo osobno wgrany plik
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: await E("Zaloguj się ponownie.") }, { status: 401 });
  if (!isValidGalleryId(id)) return NextResponse.json({ error: await E("Nieprawidłowa galeria.") }, { status: 400 });

  const { data: own } = await supabase.from("galleries").select("id").eq("id", id).maybeSingle();
  if (!own) return NextResponse.json({ error: await E("To nie jest Twoja galeria.") }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { name?: string; action?: string } | null;
  const meta = await getMeta(id);
  if (!meta) return NextResponse.json({ error: await E("Nie znaleziono galerii.") }, { status: 404 });

  // Własna okładka: adres do wgrania, potwierdzenie, usunięcie
  if (body?.action === "upload-url") {
    const url = await getSignedUrl(r2, new PutObjectCommand({ Bucket: BUCKET, Key: customCoverKey(id), ContentType: "image/jpeg" }), { expiresIn: 600 });
    return NextResponse.json({ ok: true, url });
  }
  if (body?.action === "upload-done") {
    meta.coverFile = new Date().toISOString();
    await saveMeta(id, meta);
    return NextResponse.json({ ok: true });
  }
  if (body?.action === "remove-upload") {
    await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: customCoverKey(id) })).catch(() => undefined);
    meta.coverFile = undefined;
    await saveMeta(id, meta);
    return NextResponse.json({ ok: true });
  }

  // Zdjęcie z galerii jako okładka (zastępuje wgraną okładkę)
  const name = String(body?.name ?? "");
  const keys = await listKeys(`${galleryPrefix(id)}web/`);
  if (!name || !keys.includes(`${galleryPrefix(id)}web/${name}.jpg`)) {
    return NextResponse.json({ error: await E("Nie znaleziono tego zdjęcia.") }, { status: 404 });
  }
  if (meta.coverFile) {
    await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: customCoverKey(id) })).catch(() => undefined);
    meta.coverFile = undefined;
  }
  meta.cover = name;
  await saveMeta(id, meta);
  return NextResponse.json({ ok: true });
}
