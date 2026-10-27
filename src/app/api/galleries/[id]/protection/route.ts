import { NextResponse } from "next/server";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, BUCKET, galleryPrefix } from "@/lib/r2";
import { listKeys } from "@/lib/photos";
import { getMeta, saveMeta, type Downloads } from "@/lib/galleries";
import { requireOwner } from "@/lib/owner";

export const runtime = "nodejs";

type Body =
  | { action: "save"; downloads?: Downloads; watermark?: { enabled: boolean; text: string } }
  | { action: "wm-urls"; names: string[] };

// Ochrona zdjęć: zasady pobierania i znak wodny
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const denied = await requireOwner(id);
  if (denied) return denied;

  const body = (await req.json().catch(() => null)) as Body | null;
  const meta = await getMeta(id);
  if (!body || !meta) return NextResponse.json({ error: "Nieprawidłowe dane." }, { status: 400 });
  const prefix = galleryPrefix(id);

  // Linki do nałożenia znaku wodnego na już wgrane zdjęcia (robi to przeglądarka fotografa)
  if (body.action === "wm-urls") {
    const names = (body.names ?? []).map(String).slice(0, 50);
    const items = await Promise.all(
      names.map(async (name) => ({
        name,
        src: await getSignedUrl(r2, new GetObjectCommand({ Bucket: BUCKET, Key: `${prefix}web/${name}.jpg` }), {
          expiresIn: 3600,
        }),
        put: await getSignedUrl(
          r2,
          new PutObjectCommand({ Bucket: BUCKET, Key: `${prefix}wm/${name}.jpg`, ContentType: "image/jpeg" }),
          { expiresIn: 3600 },
        ),
      })),
    );
    return NextResponse.json({ items });
  }

  if (body.downloads === "all" || body.downloads === "web" || body.downloads === "none") {
    meta.downloads = body.downloads;
  }

  let regenerate = false;
  if (body.watermark) {
    const text = String(body.watermark.text ?? "").trim().slice(0, 60);
    const enabled = Boolean(body.watermark.enabled) && text.length > 0;
    const before = meta.watermark;
    regenerate = enabled && (!before?.enabled || before.text !== text);
    meta.watermark = { enabled, text };

    // Wyłączony znak wodny: usuwamy wersje ze znakiem, żeby nie zajmowały miejsca
    if (!enabled && before?.enabled) {
      const keys = await listKeys(`${prefix}wm/`);
      for (let i = 0; i < keys.length; i += 10) {
        await Promise.all(keys.slice(i, i + 10).map((Key) => r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key }))));
      }
    }
  }

  await saveMeta(id, meta);

  // Lista zdjęć, które trzeba (ponownie) oznaczyć znakiem wodnym
  const names = regenerate
    ? (await listKeys(`${prefix}web/`)).map((k) => k.slice(`${prefix}web/`.length).replace(/\.jpg$/, ""))
    : [];
  return NextResponse.json({ ok: true, regenerate: names });
}
