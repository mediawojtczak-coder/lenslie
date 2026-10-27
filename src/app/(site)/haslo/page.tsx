import Link from "next/link";

export default async function Haslo({ searchParams }: { searchParams: Promise<{ wyslano?: string }> }) {
  const { wyslano } = await searchParams;
  return (
    <section className="login-split">
      <div className="login-form">
        <h1>Nie pamiętasz hasła?</h1>
        {wyslano ? (
          <p className="lead">
            Jeśli konto z tym adresem istnieje, wysłaliśmy na nie link do ustawienia nowego hasła. Link prowadzi do panelu,
            gdzie w „Moim koncie” wpiszesz nowe hasło.
          </p>
        ) : (
          <>
            <p className="lead">Podaj e-mail konta. Wyślemy link, po którym ustawisz nowe hasło.</p>
            <form method="post" action="/auth/reset">
              <label htmlFor="email">E-mail</label>
              <input id="email" name="email" type="email" autoComplete="email" required />
              <button className="btn btn-wide" type="submit">
                Wyślij link
              </button>
            </form>
          </>
        )}
        <p className="login-alt">
          <Link href="/logowanie">Wróć do logowania</Link>
        </p>
      </div>
      <div className="login-visual" aria-hidden="true">
        <div className="print print-1"><span /></div>
        <div className="print print-2"><span /></div>
        <div className="print print-3"><span /></div>
      </div>
    </section>
  );
}
