import { NextResponse } from "next/server";
import { isValidGalleryId } from "@/lib/r2";
import { getMeta, isExpired, accessCookieName, accessToken } from "@/lib/galleries";
import { getSelection, selectionCookie } from "@/lib/selections";

export const runtime = "nodejs";

// Osobisty link klienta z maila („Pobierz moje zdjęcia”): otwiera galerię z jego wyborem i zamówieniem
// na każdym urządzeniu i w każdej przeglądarce (np. po kliknięciu w aplikacji Gmail), bez ponownego hasła.
export async function GET(req: Request, { params }: { params: Promise<{ id: string; sel: string }> }) {
  const { id, sel } = await params;
  const base = req.url;
  const gallery = new URL(`/galeria/${id}`, base);
  if (!isValidGalleryId(id)) return NextResponse.redirect(new URL("/", base));
  const [meta, selection] = await Promise.all([getMeta(id), getSelection(id, sel)]);
  if (!meta || isExpired(meta) || !selection) return NextResponse.redirect(gallery);

  const res = NextResponse.redirect(gallery);
  const year = 60 * 60 * 24 * 365;
  res.cookies.set(selectionCookie(id), selection.id, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: year });
  if (meta.passwordHash) {
    res.cookies.set(accessCookieName(id), accessToken(id, meta), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  }
  return res;
}
