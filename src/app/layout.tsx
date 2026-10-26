import type { Metadata } from "next";
import Link from "next/link";
import { Bodoni_Moda, Jost } from "next/font/google";
import "./globals.css";

const display = Bodoni_Moda({
  subsets: ["latin", "latin-ext"],
  variable: "--font-display",
  display: "swap",
});

const body = Jost({
  subsets: ["latin", "latin-ext"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lenslie",
  description: "Eleganckie galerie zdjęć dla klientów fotografa",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" className={`${display.variable} ${body.variable}`}>
      <body>
        <header className="top">
          <Link href="/" className="wordmark">Lenslie</Link>
          <nav>
            <Link href="/galeria/demo">Przykład</Link>
            <Link href="/panel">Panel</Link>
            <Link href="/logowanie">Zaloguj</Link>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
