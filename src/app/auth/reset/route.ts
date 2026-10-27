import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Wysyła e-mail z linkiem do ustawienia nowego hasła. Zawsze odpowiada tak samo, żeby nie zdradzać, czy konto istnieje.
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const email = String(form?.get("email") ?? "").trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    try {
      const supabase = await createClient();
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${new URL(req.url).origin}/auth/potwierdz?next=${encodeURIComponent("/panel/konto?nowe-haslo=1")}`,
      });
    } catch (err) {
      console.error("Błąd resetu hasła:", err);
    }
  }
  return NextResponse.redirect(new URL("/haslo?wyslano=1", req.url), 303);
}
