import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { cleanCode } from "@/lib/referrals";
import { OAUTH_COOKIE } from "@/lib/google-auth";

// Start logowania / rejestracji przez Google: przekierowanie na ekran wyboru konta Google
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const ref = cleanCode(form?.get("ref"));
  const from = form?.get("from") === "signup" ? "/rejestracja" : "/logowanie";
  const origin = new URL(req.url).origin;
  const back = (code: string) => NextResponse.redirect(new URL(`${from}?blad=${code}`, req.url), 303);

  const jar = await cookies();
  if (ref) jar.set(OAUTH_COOKIE, ref, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 900 });

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/potwierdz?next=/panel`,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error || !data?.url) {
    console.error("Google OAuth:", error?.message ?? "brak adresu");
    return back("google");
  }
  return NextResponse.redirect(data.url, 303);
}
