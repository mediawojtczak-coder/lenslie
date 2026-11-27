import Link from "next/link";
import InstallApp from "@/components/InstallApp";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/supabase/admin";
import { lrAllowed } from "@/lib/lr";
import { albumAllowed } from "@/lib/albums";
import { getWallet, grantWelcome, WELCOME_FROM } from "@/lib/wallet";
import { sendOnboarding } from "@/lib/onboarding";
import { getLang } from "@/lib/lang-server";
import { tr, money } from "@/lib/lang";
import LangSwitch from "@/components/LangSwitch";
import MenuAutoClose from "@/components/MenuAutoClose";
import GoogleTag from "@/components/GoogleTag";
import LookSwitch from "@/components/LookSwitch";
import PullRefresh from "@/components/PullRefresh";
import PanelAssistant from "@/components/PanelAssistant";
import { assistantAllowed } from "@/lib/assistant";
import { cookies } from "next/headers";
import { CurrencyProvider } from "@/components/CurrencyProvider";
import { fmtCur } from "@/lib/foreign-prices";
import { stripeCurrency, cardMode } from "@/lib/stripe";
import type { Viewport } from "next";
import "./panel-dark.css";

export const dynamic = "force-dynamic";

// kolor paska telefonu (aplikacja na ekranie głównym i Safari) zgodny z wybranym wyglądem panelu
export async function generateViewport(): Promise<Viewport> {
  const jar = await cookies();
  return { themeColor: jar.get("lenslie_look")?.value === "dark" ? "#11100e" : "#fdfcfa" };
}

// Wspólna rama panelu fotografa: górny pasek z wyszukiwarką i kontem
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { user } = await getUser();
  if (!user) redirect("/logowanie");

  const initial = (user.email ?? "?").charAt(0).toUpperCase();
  // nowe konto: 20 zł na start (raz; przy pierwszym wejściu do panelu, czyli po potwierdzeniu e-maila)
  const [current, lang, jar] = await Promise.all([getWallet(user.id).catch(() => ({ balance: 0, history: [] })), getLang(), cookies()]);
  const look = jar.get("lenslie_look")?.value === "dark" ? "dark" : "classic";
  // wersja angielska z płatnościami kartą: bez salda w zł – zamiast 20 zł na start pierwsza galeria gratis
  const card = cardMode(user.email, lang);
  const welcomed = card ? null : await grantWelcome(user.id, user.created_at, current).catch(() => null);
  // pierwszy mail powitalny – razem z prezentem na start (raz)
  if (welcomed && user.email) await sendOnboarding(user.id, user.email, "welcome", lang).catch(() => undefined);
  // konto angielskie (karta): pierwsze wejście = wysłany mail powitalny – wtedy też liczymy rejestrację w Google Ads
  const cardWelcomed =
    card && user.email && user.created_at >= WELCOME_FROM && Date.now() - new Date(user.created_at).getTime() < 3 * 864e5
      ? await sendOnboarding(user.id, user.email, "welcome", lang).catch(() => false)
      : false;
  const wallet = welcomed ?? current;
  // angielska wersja: płatności w walucie kraju przez Stripe (na razie tylko dla administratora)
  const cur = await stripeCurrency(user.email, lang).catch(() => null);
  const fwallet = cur ? await getWallet(user.id, cur).catch(() => null) : null;
  const t = (pl: string, en: string) => tr(lang, pl, en);

  return (
    <div className={look === "dark" ? "app ui-dark" : "app"}>
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

{!card && (
          <Link href="/panel/konto?tab=saldo" className="wallet-chip" title={t("Saldo konta – doładuj", "Account balance – top up")}>
          {money(wallet.balance / 100, lang, true).replace(/ \(≈[^)]*\)$/, "")}
        </Link>
        )}
        {card && cur && (
          <Link href="/panel/konto?tab=saldo" className="wallet-chip" title="Account balance – top up">
            {fmtCur((fwallet?.balance ?? 0) / 100, cur)}
          </Link>
        )}

        <MenuAutoClose />
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
            <Link href="/panel/przypomnienia" className="account-link">{t("Przypomnienie dla klienta", "Client reminder")}</Link>
            <Link href="/panel/goscie" className="account-link">{t("Zdjęcia od gości", "Guest uploads")}</Link>
            {albumAllowed(user.email) && <Link href="/panel/albumy" className="account-link">{t("Projektor albumów", "Album designer")}</Link>}
            <Link href="/panel/rezerwacje" className="account-link">{t("Rezerwacje sesji", "Session bookings")}</Link>
            {lrAllowed(user.email) && <Link href="/panel/lightroom" className="account-link">{t("Wtyczka Lightroom", "Lightroom plug-in")}</Link>}
            {!card && <Link href="/panel/konto?tab=polecenia" className="account-link">{t("Poleć Lenslie – 20 zł", "Refer a friend – PLN 20")}</Link>}
            {isAdminEmail(user.email) && (
              <Link href="/admin" className="account-link">{t("Panel administratora", "Admin")}</Link>
            )}
            <LookSwitch initial={look} />
            <div className="account-lang">
              <LangSwitch />
            </div>
            <form method="post" action="/auth/wyloguj">
              <button type="submit">{t("Wyloguj", "Log out")}</button>
            </form>
          </div>
        </details>
      </header>
      <PullRefresh />
      <CurrencyProvider cur={cur} balance={fwallet?.balance ?? 0}>{children}</CurrencyProvider>
      {assistantAllowed(user.email) && <PanelAssistant />}
      {/* konwersja „Rejestracja Lenslie” – raz, przy przyznaniu prezentu na start */}
      <GoogleTag conversion={Boolean(welcomed) || cardWelcomed} email={user.email} uid={user.id} />
    </div>
  );
}
