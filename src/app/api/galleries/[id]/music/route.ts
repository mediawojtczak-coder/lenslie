import { NextResponse } from "next/server";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, BUCKET, galleryPrefix } from "@/lib/r2";
import { getMeta, saveMeta } from "@/lib/galleries";
import { requireOwner } from "@/lib/owner";

export const runtime = "nodejs";

const MAX = 25 * 1024 * 1024;

// Muzyka do pokazu slajdów: link do wgrania pliku MP3, potwierdzenie i usunięcie
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const denied = await requireOwner(id);
  if (denied) return denied;

  const body = (await req.json().catch(() => null)) as { step?: string; size?: number } | null;
  const meta = await getMeta(id);
  if (!meta) return NextResponse.json({ error: "Nie znaleziono galerii." }, { status: 404 });

  if (body?.step === "done") {
    meta.music = true;
    await saveMeta(id, meta);
    return NextResponse.json({ ok: true });
  }

  if (!body?.size || body.size > MAX) {
    return NextResponse.json({ error: "Plik muzyki może mieć najwyżej 25 MB." }, { status: 400 });
  }
  const url = await getSignedUrl(
    r2,
    new PutObjectCommand({ Bucket: BUCKET, Key: `${galleryPrefix(id)}music.mp3`, ContentType: "audio/mpeg" }),
    { expiresIn: 3600 },
  );
  return NextResponse.json({ url });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const denied = await requireOwner(id);
  if (denied) return denied;
  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: `${galleryPrefix(id)}music.mp3` }));
  const meta = await getMeta(id);
  if (meta) {
    meta.music = false;
    await saveMeta(id, meta);
  }
  return NextResponse.json({ ok: true });
}
