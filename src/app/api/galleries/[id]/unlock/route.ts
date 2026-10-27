import { NextResponse } from "next/server";
import { isValidGalleryId } from "@/lib/r2";
import { getMeta, verifyPassword, accessToken, accessCookieName } from "@/lib/galleries";

export const runtime = "nodejs";

// Klient wpisuje hasło do galerii; przy poprawnym dostaje ciasteczko na 30 dni
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidGalleryId(id)) {
    return NextResponse.redirect(new URL("/", req.url), 303);
  }

  const galleryUrl = new URL(`/galeria/${id}`, req.url);
  const form = await req.formData().catch(() => null);
  const password = String(form?.get("password") ?? "");

  const meta = await getMeta(id);
  if (!meta?.passwordHash) {
    return NextResponse.redirect(galleryUrl, 303);
  }

  if (!verifyPassword(password, meta.passwordHash)) {
    galleryUrl.searchParams.set("blad", "1");
    return NextResponse.redirect(galleryUrl, 303);
  }

  const res = NextResponse.redirect(galleryUrl, 303);
  res.cookies.set(accessCookieName(id), accessToken(id, meta), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
