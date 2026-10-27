import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, BUCKET, isValidGalleryId, safeFileName, baseName, galleryPrefix } from "@/lib/r2";

export const runtime = "nodejs";

type FileInfo = { name: string; type: string };

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

// Zwraca podpisane linki, pod które przeglądarka wgrywa zdjęcia bezpośrednio do R2.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { password?: string; gallery?: string; files?: FileInfo[] }
    | null;

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return NextResponse.json(
      { error: "Brak hasła administratora w ustawieniach Vercel (ADMIN_PASSWORD)." },
      { status: 500 },
    );
  }
  if (!body || body.password !== adminPassword) {
    return NextResponse.json({ error: "Nieprawidłowe hasło administratora." }, { status: 401 });
  }

  const gallery = String(body.gallery ?? "");
  if (!isValidGalleryId(gallery)) {
    return NextResponse.json(
      { error: "Adres galerii może zawierać tylko małe litery, cyfry i myślniki." },
      { status: 400 },
    );
  }

  const files = Array.isArray(body.files) ? body.files.slice(0, 50) : [];
  if (files.length === 0) {
    return NextResponse.json({ error: "Nie wybrano żadnych zdjęć." }, { status: 400 });
  }

  const prefix = galleryPrefix(gallery);
  const uploads = await Promise.all(
    files.map(async (f) => {
      const type = ALLOWED.includes(f.type) ? f.type : "image/jpeg";
      const name = safeFileName(String(f.name ?? "zdjecie.jpg"));
      const webName = `${baseName(name)}.jpg`;

      const originalUrl = await getSignedUrl(
        r2,
        new PutObjectCommand({ Bucket: BUCKET, Key: `${prefix}original/${name}`, ContentType: type }),
        { expiresIn: 3600 },
      );
      const webUrl = await getSignedUrl(
        r2,
        new PutObjectCommand({ Bucket: BUCKET, Key: `${prefix}web/${webName}`, ContentType: "image/jpeg" }),
        { expiresIn: 3600 },
      );

      return { name: f.name, type, originalUrl, webUrl };
    }),
  );

  return NextResponse.json({ gallery, uploads });
}
