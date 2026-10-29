import Link from "next/link";
import PricingPlans from "@/components/PricingPlans";
import DeviceShowcase from "@/components/DeviceShowcase";
import FeatureCards from "@/components/FeatureCards";
import { getGalleryPhotos } from "@/lib/photos";
import { getMeta } from "@/lib/galleries";
import { getLang } from "@/lib/lang-server";
import { tr } from "@/lib/lang";

export const dynamic = "force-dynamic";

// Galeria pokazowa: utwórz w panelu galerię o nazwie „Pokaz” i wgraj do niej zdjęcia na stronę główną
const SHOWCASE_ID = "pokaz";

export default async function Home() {
  const lang = await getLang();
  const t = (pl: string, en: string) => tr(lang, pl, en);
  const [photos, meta] = await Promise.all([
    getGalleryPhotos(SHOWCASE_ID).catch(() => []),
    getMeta(SHOWCASE_ID).catch(() => null),
  ]);
  const urls = photos.map((p) => p.webUrl);
  const showcaseTitle = meta?.title && meta.title.toLowerCase() !== "pokaz" ? meta.title : "Anna & Marek";

  // Zdjęcia z banera, gdy galeria „Pokaz” jest jeszcze pusta
  const fallback = [2, 1, 4, 3, 6, 5, 7, 1, 2, 4].map((n) => `/home/foto-${n}.jpg`);
  const devicePhotos = urls.length >= 6 ? urls.slice(0, 12) : fallback;

  return (
    <>
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
        <img src="/home/kolaz.jpg" alt="" className="hero-collage" width={1672} height={570} fetchPriority="high" />
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
        <PricingPlans />
        <p className="home-pricing-more">
          <Link href="/cennik">{t("Wszystko o pakietach i najczęstsze pytania", "All about plans and FAQ")}</Link>
        </p>
      </section>

      <FeatureCards lang={lang} />
    </>
  );
}
