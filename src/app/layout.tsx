import type { Metadata, Viewport } from "next";
import { EB_Garamond, Manrope } from "next/font/google";
import "./globals.css";
import { getLang } from "@/lib/lang-server";
import { LangProvider } from "@/components/LangProvider";
import NavProgress from "@/components/NavProgress";

const display = EB_Garamond({
  subsets: ["latin", "latin-ext"],
  variable: "--font-display",
  display: "swap",
});

const body = Manrope({
  subsets: ["latin", "latin-ext"],
  variable: "--font-body",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return {
    metadataBase: new URL("https://www.lenslie.com"),
    title: lang === "en" ? "Lenslie – online photo galleries for photographers" : "Lenslie – galerie zdjęć online dla fotografów",
    applicationName: "Lenslie",
    openGraph: { siteName: "Lenslie", type: "website", locale: lang === "en" ? "en_GB" : "pl_PL" },
    twitter: { card: "summary_large_image" },
    // kod weryfikacyjny Google Search Console (publiczny – i tak widać go w kodzie strony)
    verification: { google: process.env.GOOGLE_SITE_VERIFICATION || "ojHmVlQsufXDNbrn2ueRa1LLHAUjx6G0GwK2uJZqI8Q" },
    appleWebApp: { capable: true, title: "Lenslie", statusBarStyle: "default" },
    description:
      lang === "en"
        ? "Elegant online galleries for photographers' clients: favourites, full-resolution downloads, photo sales, Lightroom plug-in and album designer. Pay per gallery, from PLN 5."
        : "Eleganckie galerie online dla klientów fotografa: wybór ulubionych, pobieranie w pełnej jakości, sprzedaż zdjęć, wtyczka do Lightrooma i projektor albumów. Płacisz za galerię, od 5 zł.",
  };
}

export const viewport: Viewport = { themeColor: "#fdfcfa" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang} className={`${display.variable} ${body.variable}`}>
      <body>
        <NavProgress />
        <LangProvider lang={lang}>{children}</LangProvider>
      </body>
    </html>
  );
}
