import { NextResponse } from "next/server";
import { isValidGalleryId } from "@/lib/r2";
import { getMeta, saveMeta, hashPassword, type GalleryMeta } from "@/lib/galleries";
import { isAdmin } from "@/lib/admin";

export const runtime = "nodejs";

// Tworzy lub aktualizuje galerię: tytuł i (opcjonalnie) hasło dla klienta
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { password?: string; gallery?: string; title?: string; clientPassword?: string }
    | null;

  if (!body || !isAdmin(body.password)) {
    return NextResponse.json({ error: "Nieprawidłowe hasło administratora." }, { status: 401 });
  }

  const id = String(body.gallery ?? "");
  if (!isValidGalleryId(id)) {
    return NextResponse.json(
      { error: "Adres galerii może zawierać tylko małe litery, cyfry i myślniki." },
      { status: 400 },
    );
  }

  const clientPassword = String(body.clientPassword ?? "").trim();
  if (clientPassword && clientPassword.length < 4) {
    return NextResponse.json(
      { error: "Hasło dla klienta musi mieć co najmniej 4 znaki." },
      { status: 400 },
    );
  }

  const existing = await getMeta(id);
  const meta: GalleryMeta = {
    title: String(body.title ?? "").trim().slice(0, 120) || existing?.title || id,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    passwordHash: clientPassword ? hashPassword(clientPassword) : existing?.passwordHash,
  };
  await saveMeta(id, meta);

  return NextResponse.json({ ok: true, protected: Boolean(meta.passwordHash) });
}
