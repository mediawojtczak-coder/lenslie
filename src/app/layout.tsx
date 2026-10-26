import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lenslie",
  description: "Galerie zdjęć dla klientów fotografa",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body>
        <header className="top wrap">
          <Link href="/" className="logo">Lenslie</Link>
          <nav>
            <Link href="/panel">Panel</Link>
            <Link href="/logowanie">Zaloguj</Link>
          </nav>
        </header>
        <main className="wrap">{children}</main>
      </body>
    </html>
  );
}
