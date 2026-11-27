import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { claimOnce } from "@/lib/r2-light";
import { OAUTH_COOKIE } from "@/lib/google-auth";

// Powrót z linku w e-mailu (potwierdzenie konta albo zmiana hasła): zakłada sesję i przekierowuje do panelu
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const nextParam = url.searchParams.get("next") ?? "/panel";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/panel";

  // Anulowanie albo błąd po stronie Google – wracamy na logowanie z czytelnym komunikatem
  if (url.searchParams.get("error")) return NextResponse.redirect(new URL("/logowanie?blad=google", req.url), 303);

  const supabase = await createClient();
  let ok = false;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (tokenHash && type) {
    const otpType = type as "signup" | "recovery" | "email" | "invite" | "magiclink" | "email_change";
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: otpType });
    ok = !error;
  }

  if (!ok) return NextResponse.redirect(new URL("/logowanie?blad=link", req.url), 303);

  // Nazwa studia podana przy rejestracji trafia do profilu
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  const studio = user?.user_metadata?.studio_name;
  if (user && studio) {
    const { data: profile } = await supabase.from("profiles").select("studio_name").eq("id", user.id).maybeSingle();
    if (!profile?.studio_name) {
      await supabase.from("profiles").upsert({ id: user.id, email: user.email, studio_name: studio }, { onConflict: "id" });
    }
  }
  // Nowe konto założone przez Google: to samo, co przy zwykłej rejestracji (źródło, polecenie, język, powiadomienie)
  if (user && code && user.app_metadata?.provider === "google" && Date.now() - new Date(user.created_at).getTime() < 15 * 60 * 1000) {
    await googleSignup(req, user.id, user.email ?? "", String(user.user_metadata?.full_name ?? "")).catch((e) => console.error("Rejestracja Google:", e));
  }
  return NextResponse.redirect(new URL(next, req.url), 303);
}

async function googleSignup(req: Request, uid: string, email: string, name: string) {
  if (!(await claimOnce(`oauth-signups/${uid}`))) return; // tylko raz na konto
  const [{ getLang, setUserLang }, { recordReferral, cleanCode }, { readTouch, saveSignupSource, sourceLabel, SRC_COOKIE }, { notifyAdmins }] =
    await Promise.all([import("@/lib/lang-server"), import("@/lib/referrals"), import("@/lib/signup-source"), import("@/lib/email")]);
  const jar = await cookies();
  const refCode = cleanCode(jar.get(OAUTH_COOKIE)?.value);
  jar.delete(OAUTH_COOKIE);
  const rawTouch = readTouch(jar.get(SRC_COOKIE)?.value);
  const touch = { ...(rawTouch ?? {}), d: (/Mobi|Android|iPhone|iPod/i.test(req.headers.get("user-agent") ?? "") ? "m" : "d") as "m" | "d" };
  const lang = await getLang();
  await Promise.all([
    recordReferral(uid, email, refCode).catch(() => undefined),
    saveSignupSource(uid, touch, refCode).catch(() => undefined),
    setUserLang(uid, lang).catch(() => undefined),
  ]);
  await notifyAdmins(`Nowy fotograf (Google): ${email}`, "Nowe konto w Lenslie", [
    `E-mail: ${email}.`,
    `Imię i nazwisko z Google: ${name || "brak"}.`,
    `Język: ${lang === "en" ? "angielski" : "polski"}.${refCode ? ` Z polecenia (kod ${refCode}).` : ""}`,
    `Skąd: ${sourceLabel(touch, refCode)}${touch?.c ? ` (kampania ${touch.c})` : ""}.`,
    "Konto założone przez Google – od razu aktywne, bez maila potwierdzającego.",
  ]).catch(() => undefined);
}
