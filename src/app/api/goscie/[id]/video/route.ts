import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, BUCKET, safeFileName, baseName } from "@/lib/r2";
import { getGuestEvent, guestActive, guestPrefix, guestUsage, guestVideoDone, GUEST_LIMIT_GB, GUEST_VIDEO_MAX } from "@/lib/guest-events";

export const runtime = "nodejs";

// Filmy od gości: link do wysłania oryginału (w cenie wydarzenia) i potwierdzenie po wgraniu
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = await getGuestEvent(id);
  const msg = (pl: string, en: string) => (e?.lang === "en" ? en : pl);
  if (!e || !guestActive(e)) return NextResponse.json({ error: msg("Dodawanie jest wyłączone.", "Uploading is turned off.") }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { action?: string; name?: string; size?: number; type?: string; fileName?: string } | null;
  if (!body) return NextResponse.json({ error: msg("Nieprawidłowe dane.", "Invalid data.") }, { status: 400 });
  const prefix = `${guestPrefix(id)}video/`;

  if (body.action === "done") {
    const fileName = safeFileName(String(body.fileName ?? ""));
    const head = await r2.send(new HeadObjectCommand({ Bucket: BUCKET, Key: `${prefix}${fileName}` })).catch(() => null);
    if (!head) return NextResponse.json({ error: msg("Nie znaleziono filmu.", "Video not found.") }, { status: 404 });
    await guestVideoDone(id, baseName(fileName), fileName);
    return NextResponse.json({ ok: true });
  }

  const size = Number(body.size) || 0;
  if (size <= 0 || size > GUEST_VIDEO_MAX) {
    return NextResponse.json({ error: msg("Film może mieć najwyżej 4 GB.", "A video can be at most 4 GB.") }, { status: 400 });
  }
  if ((await guestUsage(id)) + size > GUEST_LIMIT_GB * 1e9) {
    return NextResponse.json({ error: msg("Galeria gości jest już pełna.", "The guest gallery is full."), code: "LIMIT" }, { status: 402 });
  }
  const type = String(body.type || "").startsWith("video/") ? String(body.type) : "video/mp4";
  const fileName = `${Date.now().toString(36)}${randomBytes(3).toString("hex")}-${safeFileName(String(body.name ?? "film.mp4"))}`;
  const url = await getSignedUrl(r2, new PutObjectCommand({ Bucket: BUCKET, Key: `${prefix}${fileName}`, ContentType: type }), { expiresIn: 6 * 3600 });
  return NextResponse.json({ ok: true, url, fileName, type });
}
