import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendSignupMail } from "@/lib/auth-mail";

// Zakładanie konta fotografa. Supabase wysyła e-mail z linkiem potwierdzającym.
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const email = String(form?.get("email") ?? "").trim();
  const password = String(form?.get("password") ?? "");
  const studio = String(form?.get("studio") ?? "").trim().slice(0, 80);
  const terms = form?.get("terms") === "on";

  const back = (code: string) => {
    const url = new URL("/rejestracja", req.url);
    url.searchParams.set(code === "wyslano" ? "wyslano" : "blad", code === "wyslano" ? "1" : code);
    if (email) url.searchParams.set("email", email);
    return NextResponse.redirect(url, 303);
  };

  if (process.env.REGISTRATION_OPEN !== "1") return back("zamknieta");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return back("email");
  if (password.length < 8) return back("haslo");
  if (!terms) return back("regulamin");

  try {
    const result = await sendSignupMail(email, password, studio || null, new URL(req.url).origin);
    if (result === "sent") return back("wyslano");
    if (result === "exists") return back("istnieje");
    if (result === "error") return back("serwer");
    const supabase = await createClient();
    const { error } = await supabase.auth.signUp({
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
  } catch (err) {
    console.error("Błąd rejestracji:", err);
    return back("serwer");
  }
  return back("wyslano");
}
