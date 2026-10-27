import { NextResponse } from "next/server";
import { LANG_COOKIE, isSiteLang } from "@/lib/lang";
import { getUser } from "@/lib/supabase/server";
import { setUserLang } from "@/lib/lang-server";

export const runtime = "nodejs";

// Zmiana języka serwisu: ciasteczko + zapamiętanie przy koncie (dla maili)
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { lang?: string } | null;
  const lang = isSiteLang(body?.lang) ? body!.lang : "pl";
  const res = NextResponse.json({ ok: true });
  res.cookies.set(LANG_COOKIE, lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  const { user } = await getUser().catch(() => ({ user: null }));
  if (user) await setUserLang(user.id, lang).catch(() => undefined);
  return res;
}
