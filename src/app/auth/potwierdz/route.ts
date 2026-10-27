import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Powrót z linku w e-mailu (potwierdzenie konta albo zmiana hasła): zakłada sesję i przekierowuje do panelu
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const nextParam = url.searchParams.get("next") ?? "/panel";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/panel";

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
  return NextResponse.redirect(new URL(next, req.url), 303);
}
