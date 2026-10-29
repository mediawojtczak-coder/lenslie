import Link from "next/link";
import { getLang } from "@/lib/lang-server";
import { tr } from "@/lib/lang";
import LangSwitch from "@/components/LangSwitch";
import GoogleTag, { CookieSettings } from "@/components/GoogleTag";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  const t = (pl: string, en: string) => tr(lang, pl, en);
  return (
    <>
      <header className="top">
        <Link href="/" className="wordmark">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192.png" alt="" width={28} height={28} className="wordmark-ico" />
          Lenslie
        </Link>
        <nav>
          <Link href="/cennik">{t("Cennik", "Pricing")}</Link>
          <Link href="/logowanie">{t("Zaloguj", "Log in")}</Link>
          {process.env.REGISTRATION_OPEN === "1" && (
            <Link href="/rejestracja" className="nav-cta">
              {t("Załóż konto", "Sign up")}
            </Link>
          )}
          <LangSwitch />
        </nav>
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        <p className="wordmark">Lenslie</p>
        <nav aria-label={t("Stopka", "Footer")}>
          <Link href="/cennik">{t("Cennik", "Pricing")}</Link>
          <Link href="/rejestracja">{t("Załóż konto", "Sign up")}</Link>
          <Link href="/regulamin">{t("Regulamin", "Terms of service")}</Link>
          <Link href="/polityka-prywatnosci">{t("Polityka prywatności", "Privacy policy")}</Link>
          <CookieSettings label={t("Ustawienia cookie", "Cookie settings")} />
        </nav>
        <p className="site-copy">© {new Date().getFullYear()} Lenslie. {t("Galerie zdjęć dla fotografów.", "Photo galleries for photographers.")}</p>
      </footer>
      <GoogleTag />
    </>
  );
}
