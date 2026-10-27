import LoginShowcase from "@/components/LoginShowcase";
import Link from "next/link";
import { cleanCode, REWARD, THRESHOLD } from "@/lib/referrals";

export const dynamic = "force-dynamic";

const MESSAGES: Record<string, string> = {
  email: "Sprawdź adres e-mail.",
  haslo: "Hasło musi mieć co najmniej 8 znaków.",
  regulamin: "Aby założyć konto, zaakceptuj regulamin i politykę prywatności.",
  istnieje: "Konto z tym adresem już istnieje. Zaloguj się albo odzyskaj hasło.",
  zamknieta: "Rejestracja nie jest jeszcze otwarta.",
  serwer: "Nie udało się założyć konta. Spróbuj ponownie za chwilę.",
};

export default async function Rejestracja({
  searchParams,
}: {
  searchParams: Promise<{ blad?: string; email?: string; wyslano?: string; polecenie?: string; ref?: string }>;
}) {
  const { blad, email, wyslano, polecenie, ref } = await searchParams;
  const refCode = cleanCode(polecenie ?? ref);
  const open = process.env.REGISTRATION_OPEN === "1";

  return (
    <section className="login-split">
      <div className="login-form">
        {wyslano ? (
          <>
            <h1>Sprawdź skrzynkę</h1>
            <p className="lead">
              Wysłaliśmy link potwierdzający na adres {email ? <strong>{email}</strong> : "podany e-mail"}. Kliknij go, aby
              aktywować konto i przejść do panelu.
            </p>
            <p className="hint-inline">Nie widzisz wiadomości? Zajrzyj do folderu „Oferty” lub „Spam”.</p>
          </>
        ) : !open ? (
          <>
            <h1>Już wkrótce</h1>
            <p className="lead">
              Lenslie jest w fazie testów. Rejestracja dla fotografów ruszy niedługo. Masz już konto?{" "}
              <Link href="/logowanie">Zaloguj się</Link>.
            </p>
          </>
        ) : (
          <>
            <h1>Załóż konto</h1>
            <p className="lead">Pierwsza galeria w kilka minut. Płacisz tylko za galerie, które tworzysz.</p>
            {refCode && (
              <p className="ref-banner">
                Masz polecenie od znajomego fotografa: po pierwszych wpłatach ({THRESHOLD} zł) dostaniesz <strong>{REWARD} zł</strong> na saldo.
              </p>
            )}
            <form method="post" action="/auth/zarejestruj">
              {refCode && <input type="hidden" name="ref" value={refCode} />}
              <label htmlFor="studio">Nazwa studia lub fotografa</label>
              <input id="studio" name="studio" autoComplete="organization" maxLength={80} />
              <label htmlFor="email">E-mail</label>
              <input id="email" name="email" type="email" autoComplete="email" defaultValue={email ?? ""} required />
              <label htmlFor="haslo">Hasło</label>
              <input id="haslo" name="password" type="password" autoComplete="new-password" minLength={8} required />
              <label className="check">
                <input type="checkbox" name="terms" required />
                <span>
                  Akceptuję <Link href="/regulamin">regulamin</Link> i{" "}
                  <Link href="/polityka-prywatnosci">politykę prywatności</Link>.
                </span>
              </label>
              {blad && (
                <p className="error" role="alert">
                  {MESSAGES[blad] ?? MESSAGES.serwer}
                </p>
              )}
              <button className="btn btn-wide" type="submit">
                Załóż konto
              </button>
            </form>
            <p className="login-alt">
              Masz już konto? <Link href="/logowanie">Zaloguj się</Link>
            </p>
          </>
        )}
      </div>

      <LoginShowcase />
    </section>
  );
}
