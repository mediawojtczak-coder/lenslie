import { NextResponse } from "next/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { E } from "@/lib/api-lang";
import { getLang } from "@/lib/lang-server";
import { requireOwner } from "@/lib/owner";
import { r2, BUCKET, baseName, galleryPrefix, safeFileName } from "@/lib/r2";
import { getMeta, saveMeta } from "@/lib/galleries";
import { listKeys } from "@/lib/photos";
import { prepareUploads, type FileInfo } from "@/lib/uploads";

export const runtime = "nodejs";

// Podmiana zdjęć na obrobione: plik trafia pod nazwę istniejącego zdjęcia (oryginał, wersja do oglądania,
// znak wodny), więc wybory klientów, zamówienia i kolejność zostają bez zmian.
// 1) { gallery, files: [{ name: "<nazwa istniejącego zdjęcia>.<rozszerzenie>", type, size }] } → podpisane linki
// 2) { done: ["<nazwa zdjęcia>", …] } → oznacza zdjęcia jako obrobione i usuwa stary oryginał o innym rozszerzeniu
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const denied = await requireOwner(id);
  if (denied) return denied;
  const body = (await req.json().catch(() => null)) as { files?: FileInfo[]; done?: string[]; kept?: Record<string, string> } | null;
  if (!body) return NextResponse.json({ error: await E("Nieprawidłowe dane.") }, { status: 400 });

  const prefix = galleryPrefix(id);
  const existing = new Set((await listKeys(`${prefix}web/`)).map((k) => baseName(k.slice(`${prefix}web/`.length))));

  if (Array.isArray(body.done)) {
    const names = body.done.map(String).filter((n) => existing.has(n)).slice(0, 2000);
    const kept = body.kept ?? {};
    // stary oryginał z innym rozszerzeniem (np. .JPG → .jpg) – zostaje tylko nowy plik
    const originals = await listKeys(`${prefix}original/`);
    const stale = originals.filter((k) => {
      const file = k.slice(`${prefix}original/`.length);
      const n = baseName(file);
      return names.includes(n) && kept[n] && file !== kept[n];
    });
    await Promise.all(stale.map((Key) => r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key })).catch(() => undefined)));
    const meta = await getMeta(id);
    if (meta) {
      meta.edited = [...new Set([...(meta.edited ?? []), ...names])].filter((n) => existing.has(n));
      await saveMeta(id, meta);
    }
    return NextResponse.json({ ok: true, edited: names.length });
  }

  const files = Array.isArray(body.files) ? body.files.slice(0, 50) : [];
  if (files.length === 0) return NextResponse.json({ error: await E("Nie wybrano żadnych zdjęć.") }, { status: 400 });
  // Podmieniać można tylko zdjęcia, które są w galerii
  for (const f of files) {
    if (!existing.has(baseName(safeFileName(String(f.name ?? ""))))) {
      return NextResponse.json({ error: await E("Nie ma takiego zdjęcia w galerii.") }, { status: 400 });
    }
  }
  const res = await prepareUploads(id, files, await getLang());
  if (!res.ok) return NextResponse.json({ error: res.error, code: res.code }, { status: res.status });
  return NextResponse.json({
    uploads: res.uploads.map(({ name, file, type, originalUrl, webUrl, wmUrl }) => ({ name, file, type, originalUrl, webUrl, wmUrl })),
    watermark: res.watermark,
  });
}
