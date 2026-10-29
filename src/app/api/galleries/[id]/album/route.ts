import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { E } from "@/lib/api-lang";
import { getUser } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/supabase/admin";
import { requireOwner } from "@/lib/owner";
import { r2, BUCKET, galleryPrefix, baseName } from "@/lib/r2";
import { listKeys } from "@/lib/photos";
import { saveAlbumProject, getAlbumSub, albumActive, albumAllowed } from "@/lib/albums";

export const runtime = "nodejs";

// Projekt albumu galerii: zapis z panelu i linki do oryginałów do wygenerowania plików do druku
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const denied = await requireOwner(id);
  if (denied) return denied;
  const { user } = await getUser();
  if (!albumAllowed(user?.email)) return NextResponse.json({ error: await E("Nieprawidłowe dane.") }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { action?: string; project?: unknown; names?: string[] } | null;

  if (body?.action === "save") {
    if (!(await saveAlbumProject(id, body.project))) return NextResponse.json({ error: await E("Nieprawidłowe dane.") }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (body?.action === "export") {
    const active = isAdminEmail(user?.email) || albumActive(await getAlbumSub(user!.id));
    if (!active) {
      return NextResponse.json({ error: await E("Pobieranie projektów wymaga abonamentu Projektora albumów."), code: "SUBSCRIPTION" }, { status: 402 });
    }
    const wanted = new Set((body.names ?? []).map(String).slice(0, 1000));
    const prefix = `${galleryPrefix(id)}original/`;
    const keys = (await listKeys(prefix)).filter((k) => wanted.has(baseName(k.slice(prefix.length))));
    const urls: Record<string, string> = {};
    await Promise.all(
      keys.map(async (k) => {
        urls[baseName(k.slice(prefix.length))] = await getSignedUrl(r2, new GetObjectCommand({ Bucket: BUCKET, Key: k }), { expiresIn: 7200 });
      }),
    );
    return NextResponse.json({ urls });
  }

  return NextResponse.json({ error: await E("Nieprawidłowe dane.") }, { status: 400 });
}
