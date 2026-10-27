import Link from "next/link";
import { COMPANY } from "@/lib/company";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="top">
        <Link href="/" className="wordmark">Lenslie</Link>
        <nav>
          <Link href="/cennik">Cennik</Link>
          <Link href="/logowanie">Zaloguj</Link>
        </nav>
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        <p className="wordmark">Lenslie</p>
        <nav aria-label="Stopka">
          <Link href="/cennik">Cennik</Link>
          <Link href="/rejestracja">Załóż konto</Link>
          <Link href="/regulamin">Regulamin</Link>
          <Link href="/polityka-prywatnosci">Polityka prywatności</Link>
        </nav>
        <p className="site-copy">
          © {new Date().getFullYear()} Lenslie · {COMPANY.name}, {COMPANY.address} · NIP {COMPANY.nip} ·{" "}
          <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
        </p>
      </footer>
    </>
  );
}
