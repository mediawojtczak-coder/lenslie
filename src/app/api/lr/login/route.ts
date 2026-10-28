import { createClient } from "@supabase/supabase-js";
import { issueToken, lrError, LR_PLUGIN_VERSION } from "@/lib/lr";
import { getUserLang } from "@/lib/lang-server";

export const runtime = "nodejs";

// Logowanie z wtyczki Lightroom: e-mail i hasło konta Lenslie -> klucz dla wtyczki
export async function POST(req: Request) {
  const lang = req.headers.get("accept-language")?.toLowerCase().startsWith("en") ? "en" : "pl";
  const body = (await req.json().catch(() => null)) as { email?: string; password?: string; device?: string } | null;
  const email = String(body?.email ?? "").trim();
  const password = String(body?.password ?? "");
  if (!email || !password) return lrError(lang, "Podaj e-mail i hasło do Lenslie.", "Enter your Lenslie e-mail and password.");

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "", {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    if (/confirm/i.test(error?.message ?? "")) {
      return lrError(lang, "Najpierw potwierdź konto linkiem z maila.", "Confirm your account using the link in the e-mail first.", 401);
    }
    return lrError(lang, "Nieprawidłowy e-mail lub hasło.", "Wrong e-mail or password.", 401);
  }
  await supabase.auth.signOut().catch(() => undefined);
  const token = await issueToken(data.user.id, String(body?.device ?? "Lightroom").slice(0, 60));
  const userLang = await getUserLang(data.user.id).catch(() => lang);
  return Response.json({ token, email: data.user.email, lang: userLang, version: LR_PLUGIN_VERSION });
}
