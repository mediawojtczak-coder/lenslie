import { adminClient } from "@/lib/supabase/admin";
import { sendEmail, emailLayout } from "@/lib/email";

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
export async function sendResetMail(email: string, origin: string): Promise<boolean> {
  const db = adminClient();
  if (!db || !process.env.RESEND_API_KEY) return false;
  if (tooSoon(`reset:${email.toLowerCase()}`)) return true;
  const { data, error } = await db.auth.admin.generateLink({ type: "recovery", email });
  // Nieistniejące konto: nic nie wysyłamy, ale nie zdradzamy tego na stronie
  if (error || !data?.properties?.hashed_token) return true;
  const url = confirmUrl(origin, data.properties.hashed_token, "recovery", "/panel/konto?nowe-haslo=1");
  await sendEmail({
    to: email,
    subject: "Ustaw nowe hasło do Lenslie",
    html: emailLayout(
      "Ustaw nowe hasło",
      [
        "Otrzymaliśmy prośbę o zmianę hasła do Twojego konta w Lenslie.",
        "Kliknij przycisk, a potem w „Moim koncie” wpisz nowe hasło. Link działa przez godzinę i tylko raz.",
        "Jeśli to nie Ty, zignoruj tę wiadomość – hasło się nie zmieni.",
      ],
      { label: "Ustaw nowe hasło", url },
    ),
  });
  return true;
}

export type SignupResult = "sent" | "exists" | "error" | "fallback";

// Zakłada konto i wysyła polski mail z potwierdzeniem
export async function sendSignupMail(
  email: string,
  password: string,
  studio: string | null,
  origin: string,
): Promise<SignupResult> {
  const db = adminClient();
  if (!db || !process.env.RESEND_API_KEY) return "fallback";
  const { data, error } = await db.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: { data: { studio_name: studio } },
  });
  if (error) return /registered|exists/i.test(error.message) ? "exists" : "error";
  const hashed = data?.properties?.hashed_token;
  if (!hashed) return "error";
  const url = confirmUrl(origin, hashed, data.properties.verification_type ?? "signup", "/panel");
  const ok = await sendEmail({
    to: email,
    subject: "Potwierdź konto w Lenslie",
    html: emailLayout(
      "Witaj w Lenslie",
      [
        "Dziękujemy za założenie konta. Kliknij przycisk, aby potwierdzić adres e-mail i przejść do panelu fotografa.",
        "Jeśli nie zakładałeś konta w Lenslie, zignoruj tę wiadomość.",
      ],
      { label: "Potwierdzam konto", url },
    ),
  });
  return ok ? "sent" : "error";
}
