import Link from "next/link";
import InstallApp from "@/components/InstallApp";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/supabase/admin";
import { lrAllowed } from "@/lib/lr";
import { albumAllowed } from "@/lib/albums";
import { getWallet, grantWelcome } from "@/lib/wallet";
import { getLang } from "@/lib/lang-server";
import { tr, money } from "@/lib/lang";
import LangSwitch from "@/components/LangSwitch";
import GoogleTag from "@/components/GoogleTag";

export const dynamic = "force-dynamic";

// Wspólna rama panelu fotografa: górny pasek z wyszukiwarką i kontem
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { user } = await getUser();
  if (!user) redirect("/logowanie");

  const initial = (user.email ?? "?").charAt(0).toUpperCase();
  // nowe konto: 20 zł na start (raz; przy pierwszym wejściu do panelu, czyli po potwierdzeniu e-maila)
  const welcomed = await grantWelcome(user.id, user.created_at).catch(() => null);
  const wallet = welcomed ?? (await getWallet(user.id).catch(() => ({ balance: 0, history: [] })));
  const lang = await getLang();
  const t = (pl: string, en: string) => tr(lang, pl, en);

  return (
    <div className="app">
      <header className="app-bar">
        <Link href="/panel" className="wordmark">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192.png" alt="" width={28} height={28} className="wordmark-ico" />
          Lenslie
        </Link>

        <form className="app-search" action="/panel" role="search">
          <label htmlFor="q" className="sr-only">{t("Szukaj galerii", "Search galleries")}</label>
          <input id="q" name="q" type="search" placeholder={t("Szukaj galerii lub klienta", "Search galleries or clients")} />
        </form>

        <Link href="/panel/konto?tab=saldo" className="wallet-chip" title={t("Saldo konta – doładuj", "Account balance – top up")}>
          {money(wallet.balance / 100, lang, true).replace(/ \(≈[^)]*\)$/, "")}
        </Link>

        <details className="account">
          <summary aria-label={t("Konto", "Account")}>
            <span className="avatar">{initial}</span>
          </summary>
          <div className="account-menu">
            <p>{user.email}</p>
            <Link href="/panel/konto" className="account-link">{t("Moje konto", "My account")}</Link>
            <Link href="/panel/pro" className="account-link">Lenslie Pro</Link>
            <InstallApp className="account-link" />
            <Link href="/panel/strona" className="account-link">{t("Moja strona", "My website")}</Link>
            <Link href="/panel/znajdz-siebie" className="account-link">{t("Znajdź siebie", "Find me")}</Link>
            <Link href="/panel/goscie" className="account-link">{t("Zdjęcia od gości", "Guest uploads")}</Link>
            {albumAllowed(user.email) && <Link href="/panel/albumy" className="account-link">{t("Projektor albumów", "Album designer")}</Link>}
            <Link href="/panel/rezerwacje" className="account-link">{t("Rezerwacje sesji", "Session bookings")}</Link>
            {lrAllowed(user.email) && <Link href="/panel/lightroom" className="account-link">{t("Wtyczka Lightroom", "Lightroom plug-in")}</Link>}
            <Link href="/panel/konto?tab=polecenia" className="account-link">{t("Poleć Lenslie – 20 zł", "Refer a friend – PLN 20")}</Link>
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
      {/* konwersja „Rejestracja Lenslie” – raz, przy przyznaniu prezentu na start */}
      <GoogleTag conversion={Boolean(welcomed)} />
    </div>
  );
}
