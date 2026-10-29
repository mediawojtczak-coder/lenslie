import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendSignupMail } from "@/lib/auth-mail";
import { getLang, setUserLang } from "@/lib/lang-server";
import { recordReferral, cleanCode } from "@/lib/referrals";
import { notifyAdmins } from "@/lib/email";
import { cookies } from "next/headers";
import { readTouch, saveSignupSource, sourceLabel, SRC_COOKIE } from "@/lib/signup-source";

// Zakładanie konta fotografa. Supabase wysyła e-mail z linkiem potwierdzającym.
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const email = String(form?.get("email") ?? "").trim();
  const password = String(form?.get("password") ?? "");
  const studio = String(form?.get("studio") ?? "").trim().slice(0, 80);
  const terms = form?.get("terms") === "on";
  const refCode = cleanCode(form?.get("ref"));

  const back = (code: string) => {
    const url = new URL("/rejestracja", req.url);
    url.searchParams.set(code === "wyslano" ? "wyslano" : "blad", code === "wyslano" ? "1" : code);
    if (email) url.searchParams.set("email", email);
    if (refCode && code !== "wyslano") url.searchParams.set("polecenie", refCode);
    return NextResponse.redirect(url, 303);
  };

  if (process.env.REGISTRATION_OPEN !== "1") return back("zamknieta");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return back("email");
  if (password.length < 8) return back("haslo");
  if (!terms) return back("regulamin");

  const touch = readTouch((await cookies()).get(SRC_COOKIE)?.value);
  const source = sourceLabel(touch, refCode);
  const remember = (uid: string) => saveSignupSource(uid, touch, refCode).catch(() => undefined);

  // Powiadomienie dla administratora o nowym fotografie
  const announce = (lang: string) =>
    notifyAdmins(`Nowy fotograf: ${email}${studio ? ` (${studio})` : ""}`, "Nowe konto w Lenslie", [
      `E-mail: ${email}.`,
      `Studio: ${studio || "nie podano"}.`,
      `Język: ${lang === "en" ? "angielski" : "polski"}.${refCode ? ` Z polecenia (kod ${refCode}).` : ""}`,
      `Skąd: ${source}${touch?.c ? ` (kampania ${touch.c})` : ""}.`,
      "Konto będzie aktywne po kliknięciu linku w mailu potwierdzającym.",
    ]).catch(() => undefined);

  try {
    const lang = await getLang();
    const result = await sendSignupMail(email, password, studio || null, new URL(req.url).origin, lang);
    if (result.userId) {
      await recordReferral(result.userId, email, refCode).catch(() => undefined);
      await remember(result.userId);
      await setUserLang(result.userId, lang).catch(() => undefined);
    }
    if (result.status === "sent") {
      await announce(lang);
      return back("wyslano");
    }
    if (result.status === "exists") return back("istnieje");
    if (result.status === "error") return back("serwer");
    const supabase = await createClient();
    const { data: signed, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${new URL(req.url).origin}/auth/potwierdz`,
        data: { studio_name: studio || null },
      },
    });
    if (error) {
      if (/registered|exists/i.test(error.message)) return back("istnieje");
      if (/signups not allowed/i.test(error.message)) return back("zamknieta");
      console.error("Błąd rejestracji:", error.message);
      return back("serwer");
    }
    if (signed?.user?.id) {
      await recordReferral(signed.user.id, email, refCode).catch(() => undefined);
      await remember(signed.user.id);
      await setUserLang(signed.user.id, lang).catch(() => undefined);
      await announce(lang);
    }
  } catch (err) {
    console.error("Błąd rejestracji:", err);
    return back("serwer");
  }
  return back("wyslano");
}
