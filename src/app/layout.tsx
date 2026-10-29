import type { Metadata, Viewport } from "next";
import { EB_Garamond, Manrope } from "next/font/google";
import "./globals.css";
import { getLang } from "@/lib/lang-server";
import { LangProvider } from "@/components/LangProvider";

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
    title: "Lenslie",
    applicationName: "Lenslie",
    appleWebApp: { capable: true, title: "Lenslie", statusBarStyle: "default" },
    description: lang === "en" ? "Elegant photo galleries for photographers' clients" : "Eleganckie galerie zdjęć dla klientów fotografa",
  };
}

export const viewport: Viewport = { themeColor: "#fdfcfa" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang} className={`${display.variable} ${body.variable}`}>
      <body>
        <LangProvider lang={lang}>{children}</LangProvider>
      </body>
    </html>
  );
}
