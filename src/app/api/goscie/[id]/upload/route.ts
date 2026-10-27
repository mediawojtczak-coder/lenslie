import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, BUCKET, safeFileName, baseName } from "@/lib/r2";
import { getGuestEvent, guestActive, guestPrefix, guestUsage, GUEST_LIMIT_GB } from "@/lib/guest-events";

export const runtime = "nodejs";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX_FILE = 60 * 1024 * 1024;

// Linki do wysłania zdjęć przez gości wesela (bez logowania – wystarczy link z kodu QR)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = await getGuestEvent(id);
  const en = e?.lang === "en";
  const msg = (pl: string, eng: string) => (en ? eng : pl);
  if (!e || !guestActive(e)) {
    return NextResponse.json({ error: msg("Dodawanie zdjęć jest wyłączone.", "Uploading is turned off.") }, { status: 403 });
  }
  const body = (await req.json().catch(() => null)) as { files?: { name?: string; type?: string; size?: number }[] } | null;
  const files = (body?.files ?? []).slice(0, 50);
  if (files.length === 0) return NextResponse.json({ error: msg("Nie wybrano zdjęć.", "No photos selected.") }, { status: 400 });
  if (files.some((f) => Number(f.size) > MAX_FILE)) {
    return NextResponse.json({ error: msg("Jedno ze zdjęć jest za duże (maks. 60 MB).", "One of the photos is too large (max 60 MB).") }, { status: 400 });
  }
  const incoming = files.reduce((s, f) => s + Math.max(0, Number(f.size) || 0), 0) * 1.3;
  if ((await guestUsage(id)) + incoming > GUEST_LIMIT_GB * 1024 ** 3) {
    return NextResponse.json({ error: msg("Galeria gości jest już pełna.", "The guest gallery is full."), code: "LIMIT" }, { status: 402 });
  }

  const prefix = guestPrefix(id);
  const uploads = await Promise.all(
    files.map(async (f) => {
      const type = ALLOWED.includes(String(f.type)) ? String(f.type) : "image/jpeg";
      // Unikalna nazwa: telefony różnych gości nadają te same nazwy (IMG_0001.jpg)
      const name = `${Date.now().toString(36)}${randomBytes(3).toString("hex")}-${safeFileName(String(f.name ?? "zdjecie.jpg"))}`;
      const webName = `${baseName(name)}.jpg`;
      const [originalUrl, webUrl] = await Promise.all([
        getSignedUrl(r2, new PutObjectCommand({ Bucket: BUCKET, Key: `${prefix}original/${name}`, ContentType: type }), { expiresIn: 3600 }),
        getSignedUrl(r2, new PutObjectCommand({ Bucket: BUCKET, Key: `${prefix}web/${webName}`, ContentType: "image/jpeg" }), { expiresIn: 3600 }),
      ]);
      return { name: f.name, type, originalUrl, webUrl };
    }),
  );
  return NextResponse.json({ uploads });
}
