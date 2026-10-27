import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Logowanie po stronie serwera: sesja zapisuje się w ciasteczkach od razu, bez JavaScriptu w przeglądarce
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const email = String(form?.get("email") ?? "").trim();
  const password = String(form?.get("password") ?? "");

  const back = (code: string) => {
    const url = new URL("/logowanie", req.url);
    url.searchParams.set("blad", code);
    if (email) url.searchParams.set("email", email);
    return NextResponse.redirect(url, 303);
  };

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return back("konfiguracja");
  }
  if (!email || !password) return back("dane");

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message === "Invalid login credentials") return back("dane");
      if (error.message === "Email not confirmed") return back("niepotwierdzony");
      console.error("Błąd logowania:", error.message);
      return back("serwer");
    }
  } catch (err) {
    console.error("Błąd logowania:", err);
    return back("serwer");
  }

  return NextResponse.redirect(new URL("/panel", req.url), 303);
}
