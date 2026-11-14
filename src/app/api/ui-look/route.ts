import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Wygląd panelu fotografa: klasyczny (jasny) albo ciemny – zapamiętany w ciasteczku na rok
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { look?: string } | null;
  const look = body?.look === "dark" ? "dark" : "classic";
  const res = NextResponse.json({ ok: true, look });
  res.cookies.set("lenslie_look", look, { path: "/", maxAge: 365 * 24 * 3600, sameSite: "lax" });
  return res;
}
