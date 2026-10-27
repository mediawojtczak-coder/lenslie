import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MESSAGES: Record<string, string> = {
  dane: "Nieprawidłowy e-mail lub hasło.",
  niepotwierdzony: "Konto nie jest potwierdzone. W Supabase potwierdź użytkownika (Auto Confirm).",
  konfiguracja: "Brak kluczy Supabase w tej wersji strony. Zrób Redeploy w Vercelu.",
  serwer: "Serwer logowania nie odpowiada poprawnie. Spróbuj za chwilę.",
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

  const message = blad ? (MESSAGES[blad] ?? MESSAGES.serwer) : "";

  return (
    <section className="narrow">
      <h1>Witaj ponownie</h1>
      <p className="lead">Zaloguj się, aby zarządzać galeriami.</p>
      <form method="post" action="/auth/zaloguj">
        <label htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="email" defaultValue={email ?? ""} required />
        <label htmlFor="haslo">Hasło</label>
        <input id="haslo" name="password" type="password" autoComplete="current-password" required />
        {message && (
          <p className="error" role="alert">
            {message}
          </p>
        )}
        <button className="btn" type="submit">Zaloguj się</button>
      </form>
    </section>
  );
}
