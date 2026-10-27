import LoginShowcase from "@/components/LoginShowcase";
import Link from "next/link";
import { getLang } from "@/lib/lang-server";

export default async function Haslo({ searchParams }: { searchParams: Promise<{ wyslano?: string }> }) {
  const { wyslano } = await searchParams;
  const lang = await getLang();
  const en = lang === "en";
  return (
    <section className="login-split">
      <div className="login-form">
        <h1>{en ? "Forgot your password?" : "Nie pamiętasz hasła?"}</h1>
        {wyslano ? (
          <p className="lead">
            {en
              ? "If an account with this address exists, we have sent a link to set a new password. It takes you to your dashboard, where you can enter a new password in “My account”."
              : "Jeśli konto z tym adresem istnieje, wysłaliśmy na nie link do ustawienia nowego hasła. Link prowadzi do panelu, gdzie w „Moim koncie” wpiszesz nowe hasło."}
          </p>
        ) : (
          <>
            <p className="lead">{en ? "Enter your account email. We will send you a link to set a new password." : "Podaj e-mail konta. Wyślemy link, po którym ustawisz nowe hasło."}</p>
            <form method="post" action="/auth/reset">
              <label htmlFor="email">{en ? "Email" : "E-mail"}</label>
              <input id="email" name="email" type="email" autoComplete="email" required />
              <button className="btn btn-wide" type="submit">
                {en ? "Send link" : "Wyślij link"}
              </button>
            </form>
          </>
        )}
        <p className="login-alt">
          <Link href="/logowanie">{en ? "Back to log in" : "Wróć do logowania"}</Link>
        </p>
      </div>
      <LoginShowcase lang={lang} />
    </section>
  );
}
