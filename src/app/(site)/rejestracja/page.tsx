import LoginShowcase from "@/components/LoginShowcase";
import { usdify } from "@/lib/lang";
import Link from "next/link";
import { cleanCode, REWARD, THRESHOLD } from "@/lib/referrals";
import { getLang } from "@/lib/lang-server";

export const dynamic = "force-dynamic";

const TXT = {
  pl: {
    errors: {
      email: "Sprawdź adres e-mail.",
      haslo: "Hasło musi mieć co najmniej 8 znaków.",
      regulamin: "Aby założyć konto, zaakceptuj regulamin i politykę prywatności.",
      istnieje: "Konto z tym adresem już istnieje. Zaloguj się albo odzyskaj hasło.",
      zamknieta: "Rejestracja nie jest jeszcze otwarta.",
      serwer: "Nie udało się założyć konta. Spróbuj ponownie za chwilę.",
    } as Record<string, string>,
    checkTitle: "Sprawdź skrzynkę",
    checkLead: (e: string) => `Wysłaliśmy link potwierdzający na adres ${e}. Kliknij go, aby aktywować konto i przejść do panelu.`,
    theEmail: "podany e-mail",
    spam: "Nie widzisz wiadomości? Zajrzyj do folderu „Oferty” lub „Spam”.",
    soonTitle: "Już wkrótce",
    soonLead: "Lenslie jest w fazie testów. Rejestracja dla fotografów ruszy niedługo. Masz już konto?",
    login: "Zaloguj się",
    title: "Załóż konto",
    lead: "Pierwsza galeria w kilka minut. Płacisz tylko za galerie, które publikujesz.",
    ref: (r: number, t: number) => `Masz polecenie od znajomego fotografa: po pierwszych wpłatach (${t} zł) dostaniesz ${r} zł na saldo.`,
    studio: "Nazwa studia lub fotografa",
    email: "E-mail",
    password: "Hasło",
    accept: "Akceptuję",
    terms: "regulamin",
    and: "i",
    privacy: "politykę prywatności",
    submit: "Załóż konto",
    have: "Masz już konto?",
  },
  en: {
    errors: {
      email: "Please check your email address.",
      haslo: "Your password must be at least 8 characters long.",
      regulamin: "To create an account, please accept the terms of service and privacy policy.",
      istnieje: "An account with this email already exists. Log in or reset your password.",
      zamknieta: "Sign-ups are not open yet.",
      serwer: "Could not create your account. Please try again shortly.",
    } as Record<string, string>,
    checkTitle: "Check your inbox",
    checkLead: (e: string) => `We have sent a confirmation link to ${e}. Click it to activate your account and open your dashboard.`,
    theEmail: "your email",
    spam: "Can't see the email? Check your spam or promotions folder.",
    soonTitle: "Coming soon",
    soonLead: "Lenslie is in beta. Sign-ups for photographers will open soon. Already have an account?",
    login: "Log in",
    title: "Create your account",
    lead: "Your first gallery in minutes. Pay only for the galleries you publish.",
    ref: (r: number, t: number) => `You were invited by a fellow photographer: after your first payments (PLN ${t}) you get PLN ${r} added to your balance.`,
    studio: "Studio or photographer name",
    email: "Email",
    password: "Password",
    accept: "I accept the",
    terms: "terms of service",
    and: "and",
    privacy: "privacy policy",
    submit: "Create account",
    have: "Already have an account?",
  },
};

export default async function Rejestracja({
  searchParams,
}: {
  searchParams: Promise<{ blad?: string; email?: string; wyslano?: string; polecenie?: string; ref?: string }>;
}) {
  const { blad, email, wyslano, polecenie, ref } = await searchParams;
  const refCode = cleanCode(polecenie ?? ref);
  const open = process.env.REGISTRATION_OPEN === "1";
  const lang = await getLang();
  const t = TXT[lang];

  return (
    <section className="login-split">
      <div className="login-form">
        {wyslano ? (
          <>
            <h1>{t.checkTitle}</h1>
            <p className="lead">{t.checkLead(email ?? t.theEmail)}</p>
            <p className="hint-inline">{t.spam}</p>
          </>
        ) : !open ? (
          <>
            <h1>{t.soonTitle}</h1>
            <p className="lead">
              {t.soonLead} <Link href="/logowanie">{t.login}</Link>.
            </p>
          </>
        ) : (
          <>
            <h1>{t.title}</h1>
            <p className="lead">{t.lead}</p>
            <p className="ref-banner">
              {lang === "en"
                ? usdify("Sign up and get PLN 20 on your balance to start – enough for your first gallery.")
                : "Załóż konto i odbierz 20 zł na start – wystarczy na pierwszą galerię."}
            </p>
            {refCode && <p className="ref-banner">{lang === "en" ? usdify(t.ref(REWARD, THRESHOLD)) : t.ref(REWARD, THRESHOLD)}</p>}
            <form method="post" action="/auth/zarejestruj">
              {refCode && <input type="hidden" name="ref" value={refCode} />}
              <label htmlFor="studio">{t.studio}</label>
              <input id="studio" name="studio" autoComplete="organization" maxLength={80} />
              <label htmlFor="email">{t.email}</label>
              <input id="email" name="email" type="email" autoComplete="email" defaultValue={email ?? ""} required />
              <label htmlFor="haslo">{t.password}</label>
              <input id="haslo" name="password" type="password" autoComplete="new-password" minLength={8} required />
              <label className="check">
                <input type="checkbox" name="terms" required />
                <span>
                  {t.accept} <Link href="/regulamin">{t.terms}</Link> {t.and} <Link href="/polityka-prywatnosci">{t.privacy}</Link>.
                </span>
              </label>
              {blad && (
                <p className="error" role="alert">
                  {t.errors[blad] ?? t.errors.serwer}
                </p>
              )}
              <button className="btn btn-wide" type="submit">
                {t.submit}
              </button>
            </form>
            <p className="login-alt">
              {t.have} <Link href="/logowanie">{t.login}</Link>
            </p>
          </>
        )}
      </div>

      <LoginShowcase lang={lang} />
    </section>
  );
}
