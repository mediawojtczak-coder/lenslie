import Link from "@/components/SiteLink";
import { langAlternates } from "@/lib/en-paths";
import { unstable_cache } from "next/cache";
import type { Metadata } from "next";
import { siteCur } from "@/lib/viewer-cur";
import PricingPlans from "@/components/PricingPlans";
import DeviceShowcase from "@/components/DeviceShowcase";
import FeatureCards from "@/components/FeatureCards";
import { getGalleryPhotos } from "@/lib/photos";
import { getMeta } from "@/lib/galleries";
import { getLang } from "@/lib/lang-server";
import { ogImage } from "@/lib/og";
import { tr } from "@/lib/lang";

export const dynamic = "force-dynamic";

// Tytuł w Google z frazą, której szukają fotografowie („galeria online dla fotografa”)
export async function generateMetadata(): Promise<Metadata> {
  const en = (await getLang()) === "en";
  return {
    title: en ? "Online client galleries for photographers | Lenslie" : "Galeria online dla fotografa – zdjęcia dla klientów | Lenslie",
    // osobny adres wersji angielskiej (lenslie.com/en) – dla Google i podglądów linków w social media
    alternates: langAlternates("/", en ? "en" : "pl"),
    openGraph: { url: en ? "/en" : "/", siteName: "Lenslie", type: "website", locale: en ? "en_GB" : "pl_PL", images: [ogImage(en ? "en" : "pl")] },
  };
}

// Dane strukturalne dla Google: Lenslie jako aplikacja internetowa z ceną od 5 zł
// Organization + WebSite pomagają Google połączyć nazwę „Lenslie” z firmą (a nie z imieniem „Leslie”)
const ORG_LD = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Lenslie",
    alternateName: "Lenslie – galerie zdjęć online dla fotografów",
    url: "https://www.lenslie.com",
    logo: "https://www.lenslie.com/icon-512.png",
    sameAs: ["https://www.facebook.com/profile.php?id=61595950988743", "https://www.instagram.com/lenslie_com/"],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Lenslie",
    alternateName: ["Lenslie galerie", "lenslie.com"],
    url: "https://www.lenslie.com",
    inLanguage: ["pl", "en"],
  },
];

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Lenslie",
  url: "https://www.lenslie.com",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: "Galerie zdjęć online dla fotografów: wybór ulubionych, pobieranie w pełnej jakości, sprzedaż zdjęć, wtyczka do Lightrooma i projektor albumów.",
  offers: { "@type": "AggregateOffer", priceCurrency: "PLN", lowPrice: "5", highPrice: "249" },
};

// Wersja angielska (lenslie.com/en): opis po angielsku, ceny w euro
const JSON_LD_EN = {
  ...JSON_LD,
  url: "https://www.lenslie.com/en",
  inLanguage: "en",
  description: "Online client galleries for photographers: favourites, full-quality downloads, photo sales, a Lightroom plugin and an album designer.",
  offers: { "@type": "AggregateOffer", priceCurrency: "EUR", lowPrice: "2", highPrice: "62" },
};

// Galeria pokazowa: utwórz w panelu galerię o nazwie „Pokaz” i wgraj do niej zdjęcia na stronę główną
const SHOWCASE_ID = "pokaz";

// Zdjęcia galerii pokazowej zapamiętane na 45 minut (linki są ważne 2 godziny) – strona główna nie przegląda
// magazynu przy każdym wejściu
const showcase = unstable_cache(
  async () => {
    const [photos, meta] = await Promise.all([getGalleryPhotos(SHOWCASE_ID).catch(() => []), getMeta(SHOWCASE_ID).catch(() => null)]);
    return { urls: photos.slice(0, 12).map((p) => p.webUrl), title: meta?.title ?? null };
  },
  ["home-showcase-v1"],
  { revalidate: 2700 },
);

export default async function Home() {
  const lang = await getLang();
  const t = (pl: string, en: string) => tr(lang, pl, en);
  const { urls, title: metaTitle } = await showcase();
  const showcaseTitle = metaTitle && metaTitle.toLowerCase() !== "pokaz" ? metaTitle : "Anna & Marek";

  // Zdjęcia z banera, gdy galeria „Pokaz” jest jeszcze pusta
  const fallback = [2, 1, 4, 3, 6, 5, 7, 1, 2, 4].map((n) => `/home/foto-${n}.jpg`);
  const devicePhotos = urls.length >= 6 ? urls.slice(0, 12) : fallback;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([...ORG_LD, lang === "en" ? JSON_LD_EN : JSON_LD]) }} />
      <section className="hero">
        <h1>{t("Twoje zdjęcia zasługują na piękną oprawę.", "Your photos deserve a beautiful setting.")}</h1>
        <p>
          {t(
            "Oddawaj sesje klientom w spokojnej, eleganckiej galerii. Bez reklam, bez kompresji, z hasłem i pobieraniem w pełnej jakości.",
            "Deliver sessions to your clients in a calm, elegant gallery. No ads, no compression, password protected, with full-quality downloads.",
          )}
        </p>
      </section>

      <section className="hero-visual" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={lang === "en" ? "/home/kolaz-en.jpg" : "/home/kolaz.jpg"} alt="" className="hero-collage" width={1672} height={570} fetchPriority="high" />
        <div className="hero-collage-mobile">
          {["foto-1", "foto-2", "foto-4", "foto-7"].map((f) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={f} src={`/home/${f}.jpg`} alt="" loading="lazy" />
          ))}
        </div>
      </section>

      <section className="features">
        <div>
          <h2>{t("Prywatnie", "Private")}</h2>
          <p>{t("Każda galeria ma własny link i hasło. Widzi ją tylko Twój klient.", "Every gallery has its own link and password. Only your client can see it.")}</p>
        </div>
        <div>
          <h2>{t("W pełnej jakości", "Full quality")}</h2>
          <p>{t("Klient pobiera pojedyncze zdjęcia albo całą sesję jednym kliknięciem.", "Clients download single photos or the whole session in one click.")}</p>
        </div>
        <div>
          <h2>{t("Pod Twoją marką", "Your brand")}</h2>
          <p>{t("Twoje logo, Twoja domena. Lenslie pozostaje w tle.", "Your logo, your domain. Lenslie stays in the background.")}</p>
        </div>
      </section>

      <section className="showcase">
        <div className="showcase-text">
          <h2>{t("Tak zobaczy to Twój klient", "What your client will see")}</h2>
          <p>
            {t(
              "Zdjęcie z sesji na cały ekran, a pod nim cała galeria. Na komputerze i telefonie, bez instalowania czegokolwiek.",
              "A full-screen cover photo with the whole gallery below. On desktop and mobile, nothing to install.",
            )}
          </p>
        </div>
        <DeviceShowcase photos={devicePhotos} title={showcaseTitle} lang={lang} />
      </section>

      <section className="home-pricing" id="cennik">
        <h2>{t("Prosty cennik", "Simple pricing")}</h2>
        <p>{t("Płacisz tylko za galerie, które oddajesz klientom. Bez abonamentu.", "Pay only for the galleries you deliver. No subscription.")}</p>
        <PricingPlans cur={await siteCur(lang)} />
        <p className="home-pricing-more">
          <Link href="/cennik">{t("Wszystko o pakietach i najczęstsze pytania", "All about plans and FAQ")}</Link>
        </p>
      </section>

      <FeatureCards lang={lang} cur={await siteCur(lang)} />
    </>
  );
}
