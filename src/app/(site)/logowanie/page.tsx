import LoginShowcase from "@/components/LoginShowcase";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { getLang } from "@/lib/lang-server";

export const dynamic = "force-dynamic";

const MESSAGES: Record<"pl" | "en", Record<string, string>> = {
  pl: {
    dane: "Nieprawidłowy e-mail lub hasło.",
    niepotwierdzony: "Konto nie jest jeszcze potwierdzone. Kliknij link w wiadomości, którą wysłaliśmy po rejestracji.",
    konfiguracja: "Logowanie jest chwilowo niedostępne. Spróbuj za chwilę.",
    serwer: "Serwer logowania nie odpowiada poprawnie. Spróbuj za chwilę.",
    link: "Link z wiadomości wygasł albo był już użyty. Zaloguj się lub poproś o nowy.",
  },
  en: {
    dane: "Incorrect email or password.",
    niepotwierdzony: "Your account is not confirmed yet. Click the link in the email we sent after you signed up.",
    konfiguracja: "Logging in is temporarily unavailable. Please try again shortly.",
    serwer: "The login server is not responding. Please try again shortly.",
    link: "The link has expired or was already used. Log in or request a new one.",
  },
};

export default async function Logowanie({
  searchParams,
}: {
  searchParams: Promise<{ blad?: string; email?: string }>;
}) {
  const { blad, email } = await searchParams;

  let loggedIn = false;
  try {
    const { user } = await getUser();
    loggedIn = Boolean(user);
  } catch {
    loggedIn = false;
  }
  if (loggedIn) redirect("/panel");

  const lang = await getLang();
  const M = MESSAGES[lang];
  const en = lang === "en";
  const message = blad ? (M[blad] ?? M.serwer) : "";

  return (
    <section className="login-split">
      <div className="login-form">
        <h1>{en ? "Welcome back" : "Witaj ponownie"}</h1>
        <p className="lead">{en ? "Log in to your photographer dashboard to deliver your next session." : "Zaloguj się do panelu fotografa, aby oddać kolejną sesję."}</p>
        <form method="post" action="/auth/zaloguj">
          <label htmlFor="email">{en ? "Email" : "E-mail"}</label>
          <input id="email" name="email" type="email" autoComplete="email" defaultValue={email ?? ""} required />
          <label htmlFor="haslo">{en ? "Password" : "Hasło"}</label>
          <input id="haslo" name="password" type="password" autoComplete="current-password" required />
          {message && (
            <p className="error" role="alert">
              {message}
            </p>
          )}
          <button className="btn btn-wide" type="submit">{en ? "Log in" : "Zaloguj się"}</button>
        </form>
        <p className="login-alt">
          <Link href="/haslo">{en ? "Forgot your password?" : "Nie pamiętasz hasła?"}</Link>
          <span aria-hidden="true"> · </span>
          <Link href="/rejestracja">{en ? "Sign up" : "Załóż konto"}</Link>
        </p>
      </div>

      <LoginShowcase lang={lang} />
    </section>
  );
}
