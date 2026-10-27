import Link from "next/link";

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
    </>
  );
}
