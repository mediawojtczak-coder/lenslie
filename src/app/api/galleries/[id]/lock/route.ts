import { NextResponse } from "next/server";
import { isValidGalleryId } from "@/lib/r2";
import { accessCookieName } from "@/lib/galleries";

// Wylogowanie klienta z galerii: usuwa zapamiętany dostęp i wraca do okładki z hasłem
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidGalleryId(id)) return NextResponse.redirect(new URL("/", req.url), 303);
  const res = NextResponse.redirect(new URL(`/galeria/${id}`, req.url), 303);
  res.cookies.set(accessCookieName(id), "", { path: "/", maxAge: 0, httpOnly: true, secure: true, sameSite: "lax" });
  return res;
}
