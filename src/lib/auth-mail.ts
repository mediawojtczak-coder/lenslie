import { adminClient } from "@/lib/supabase/admin";
import { sendEmail, emailLayout } from "@/lib/email";
import type { SiteLang } from "@/lib/lang";

// Maile logowania wysyłane przez Lenslie (po polsku, w stylu strony) zamiast szablonów Supabase.
// Supabase tylko tworzy bezpieczny jednorazowy token, a link prowadzi do /auth/potwierdz na naszej stronie.

const recent = new Map<string, number>();
// Prosta ochrona przed zasypaniem skrzynki: najwyżej jeden mail na adres na minutę (w obrębie instancji serwera)
function tooSoon(key: string) {
  const now = Date.now();
  const last = recent.get(key);
  if (last && now - last < 60_000) return true;
  recent.set(key, now);
  return false;
}

function confirmUrl(origin: string, tokenHash: string, type: string, next: string) {
  const u = new URL("/auth/potwierdz", origin);
  u.searchParams.set("token_hash", tokenHash);
  u.searchParams.set("type", type);
  u.searchParams.set("next", next);
  return u.toString();
}

// Zwraca true, gdy mail został wysłany przez Lenslie; false, gdy trzeba użyć wysyłki Supabase
export async function sendResetMail(email: string, origin: string, lang: SiteLang = "pl"): Promise<boolean> {
  const db = adminClient();
  if (!db || !process.env.RESEND_API_KEY) return false;
  if (tooSoon(`reset:${email.toLowerCase()}`)) return true;
  const { data, error } = await db.auth.admin.generateLink({ type: "recovery", email });
  if (error || !data?.properties?.hashed_token) {
    // Nieistniejące konto: nic nie wysyłamy, ale nie zdradzamy tego na stronie
    if (error && /not.?found|no user/i.test(error.message)) return true;
    console.error("Reset hasła – generateLink:", error?.message ?? "brak tokenu");
    return false; // inny błąd: niech wyśle Supabase
  }
  const url = confirmUrl(origin, data.properties.hashed_token, "recovery", "/panel/konto?nowe-haslo=1");
  const sent = await sendEmail({
    to: email,
    subject: lang === "en" ? "Set a new Lenslie password" : "Ustaw nowe hasło do Lenslie",
    html: lang === "en" ? emailLayout(
      "Set a new password",
      [
        "We received a request to change the password for your Lenslie account.",
        "Click the button, then enter a new password in “My account”. The link works for one hour and only once.",
        "If this wasn't you, ignore this message – your password won't change.",
      ],
      { label: "Set a new password", url },
      "en",
    ) : emailLayout(
      "Ustaw nowe hasło",
      [
        "Otrzymaliśmy prośbę o zmianę hasła do Twojego konta w Lenslie.",
        "Kliknij przycisk, a potem w „Moim koncie” wpisz nowe hasło. Link działa przez godzinę i tylko raz.",
        "Jeśli to nie Ty, zignoruj tę wiadomość – hasło się nie zmieni.",
      ],
      { label: "Ustaw nowe hasło", url },
    ),
  });
  if (!sent) console.error("Reset hasła – wysyłka Resend nie powiodła się");
  return sent;
}

// Diagnostyka dla panelu administratora: co dokładnie dzieje się przy wysyłce resetu
export async function diagnoseReset(email: string, origin: string): Promise<string> {
  const db = adminClient();
  if (!db) return "Brak SUPABASE_SECRET_KEY.";
  if (!process.env.RESEND_API_KEY) return "Brak RESEND_API_KEY.";
  const { data, error } = await db.auth.admin.generateLink({ type: "recovery", email });
  if (error) return `Supabase generateLink: ${error.message}`;
  if (!data?.properties?.hashed_token) return "Supabase nie zwrócił tokenu.";
  const err = await sendEmailDetailed(email, confirmUrl(origin, data.properties.hashed_token, "recovery", "/panel/konto?nowe-haslo=1"));
  return err ?? "OK – mail resetu wysłany.";
}

async function sendEmailDetailed(to: string, url: string): Promise<string | null> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Lenslie <powiadomienia@lenslie.com>",
      to,
      subject: "Ustaw nowe hasło do Lenslie (test)",
      html: emailLayout("Ustaw nowe hasło", ["Testowa wiadomość resetu hasła z panelu administratora."], { label: "Ustaw nowe hasło", url }),
    }),
  }).catch((e) => e as Error);
  if (res instanceof Error) return `Resend: ${res.message}`;
  if (!res.ok) return `Resend ${res.status}: ${await res.text().catch(() => "")}`;
  return null;
}

export type SignupResult = { status: "sent" | "exists" | "error" | "fallback"; userId?: string };

// Zakłada konto i wysyła polski mail z potwierdzeniem
export async function sendSignupMail(
  email: string,
  password: string,
  studio: string | null,
  origin: string,
  lang: SiteLang = "pl",
): Promise<SignupResult> {
  const db = adminClient();
  if (!db || !process.env.RESEND_API_KEY) return { status: "fallback" };
  const { data, error } = await db.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: { data: { studio_name: studio } },
  });
  if (error) return { status: /registered|exists/i.test(error.message) ? "exists" : "error" };
  const hashed = data?.properties?.hashed_token;
  if (!hashed) return { status: "error" };
  const url = confirmUrl(origin, hashed, data.properties.verification_type ?? "signup", "/panel");
  const ok = await sendEmail({
    to: email,
    subject: lang === "en" ? "Confirm your Lenslie account" : "Potwierdź konto w Lenslie",
    html: lang === "en" ? emailLayout(
      "Welcome to Lenslie",
      [
        "Thank you for creating an account. Click the button to confirm your email address and go to your photographer dashboard.",
        "If you didn't create a Lenslie account, ignore this message.",
      ],
      { label: "Confirm my account", url },
      "en",
    ) : emailLayout(
      "Witaj w Lenslie",
      [
        "Dziękujemy za założenie konta. Kliknij przycisk, aby potwierdzić adres e-mail i przejść do panelu fotografa.",
        "Jeśli nie zakładałeś konta w Lenslie, zignoruj tę wiadomość.",
      ],
      { label: "Potwierdzam konto", url },
    ),
  });
  return { status: ok ? "sent" : "error", userId: data.user?.id };
}
