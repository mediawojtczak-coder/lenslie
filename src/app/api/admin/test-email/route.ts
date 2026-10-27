import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/supabase/admin";
import { sendEmail, emailLayout, siteUrl } from "@/lib/email";

export const runtime = "nodejs";

// Testowy e-mail na adres administratora – sprawdza, czy wysyłka przez Resend działa
export async function POST(req: Request) {
  const { user } = await getUser();
  if (!user || !isAdminEmail(user.email)) return NextResponse.json({ error: "Brak dostępu." }, { status: 403 });

  const back = (msg: string) => NextResponse.redirect(new URL(`/admin?mail=${msg}`, req.url), 303);
  if (!process.env.RESEND_API_KEY) return back("brak-klucza");

  const ok = await sendEmail({
    to: user.email!,
    subject: "Test wysyłki – Lenslie",
    html: emailLayout(
      "Wysyłka działa",
      ["To testowa wiadomość z Lenslie. Jeśli ją widzisz, przypomnienia i powiadomienia będą docierać do fotografów."],
      { label: "Przejdź do panelu", url: `${siteUrl()}/panel` },
    ),
  });
  return back(ok ? "wyslany" : "blad");
}
