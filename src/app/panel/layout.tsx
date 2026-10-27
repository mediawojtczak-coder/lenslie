import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/supabase/admin";
import { getWallet } from "@/lib/wallet";
import { getLang } from "@/lib/lang-server";
import { tr, money } from "@/lib/lang";
import LangSwitch from "@/components/LangSwitch";

export const dynamic = "force-dynamic";

// Wspólna rama panelu fotografa: górny pasek z wyszukiwarką i kontem
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { user } = await getUser();
  if (!user) redirect("/logowanie");

  const initial = (user.email ?? "?").charAt(0).toUpperCase();
  const wallet = await getWallet(user.id).catch(() => ({ balance: 0, history: [] }));
  const lang = await getLang();
  const t = (pl: string, en: string) => tr(lang, pl, en);

  return (
    <div className="app">
      <header className="app-bar">
        <Link href="/panel" className="wordmark">Lenslie</Link>

        <form className="app-search" action="/panel" role="search">
          <label htmlFor="q" className="sr-only">{t("Szukaj galerii", "Search galleries")}</label>
          <input id="q" name="q" type="search" placeholder={t("Szukaj galerii lub klienta", "Search galleries or clients")} />
        </form>

        <Link href="/panel/konto#saldo" className="wallet-chip" title={t("Saldo konta – doładuj", "Account balance – top up")}>
          {money(wallet.balance / 100, lang, true)}
        </Link>

        <details className="account">
          <summary aria-label={t("Konto", "Account")}>
            <span className="avatar">{initial}</span>
          </summary>
          <div className="account-menu">
            <p>{user.email}</p>
            <Link href="/panel/konto" className="account-link">{t("Moje konto", "My account")}</Link>
            <Link href="/panel/rezerwacje" className="account-link">{t("Rezerwacje sesji", "Session bookings")}</Link>
            <Link href="/panel/konto#polecenia" className="account-link">{t("Poleć Lenslie – 20 zł", "Refer a friend – PLN 20")}</Link>
            {isAdminEmail(user.email) && (
              <Link href="/admin" className="account-link">{t("Panel administratora", "Admin")}</Link>
            )}
            <div className="account-lang">
              <LangSwitch />
            </div>
            <form method="post" action="/auth/wyloguj">
              <button type="submit">{t("Wyloguj", "Log out")}</button>
            </form>
          </div>
        </details>
      </header>
      {children}
    </div>
  );
}
