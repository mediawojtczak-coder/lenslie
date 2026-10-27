import Link from "next/link";
import PricingPlans from "@/components/PricingPlans";
import DeviceShowcase from "@/components/DeviceShowcase";
import { getGalleryPhotos } from "@/lib/photos";
import { getMeta } from "@/lib/galleries";

export const dynamic = "force-dynamic";

// Galeria pokazowa: utwórz w panelu galerię o nazwie „Pokaz” i wgraj do niej zdjęcia na stronę główną
const SHOWCASE_ID = "pokaz";

export default async function Home() {
  const [photos, meta] = await Promise.all([
    getGalleryPhotos(SHOWCASE_ID).catch(() => []),
    getMeta(SHOWCASE_ID).catch(() => null),
  ]);
  const urls = photos.map((p) => p.webUrl);
  const showcaseTitle = meta?.title && meta.title.toLowerCase() !== "pokaz" ? meta.title : "Anna & Marek";

  const tiles = ["t1 b", "t2", "t3 c", "t4 d"];

  return (
    <>
      <section className="hero">
        <h1>Twoje zdjęcia zasługują na piękną oprawę.</h1>
        <p>
          Oddawaj sesje klientom w spokojnej, eleganckiej galerii. Bez reklam,
          bez kompresji, z hasłem i pobieraniem w pełnej jakości.
        </p>
        <div className="actions">
          <Link href="/logowanie" className="btn">Załóż konto</Link>
          <Link href="/cennik" className="link-quiet">Zobacz cennik</Link>
        </div>
      </section>

      <section className="mosaic" aria-hidden="true">
        {tiles.map((t, i) =>
          urls[i] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={t} src={urls[i]} alt="" className={`tile mosaic-img ${t}`} />
          ) : (
            <div key={t} className={`tile ${t}`} />
          ),
        )}
      </section>

      <section className="features">
        <div>
          <h2>Prywatnie</h2>
          <p>Każda galeria ma własny link i hasło. Widzi ją tylko Twój klient.</p>
        </div>
        <div>
          <h2>W pełnej jakości</h2>
          <p>Klient pobiera pojedyncze zdjęcia albo całą sesję jednym kliknięciem.</p>
        </div>
        <div>
          <h2>Pod Twoją marką</h2>
          <p>Twoje logo, Twoja domena. Lenslie pozostaje w tle.</p>
        </div>
      </section>

      <section className="showcase">
        <div className="showcase-text">
          <h2>Tak zobaczy to Twój klient</h2>
          <p>
            Zdjęcie z sesji na cały ekran, a pod nim cała galeria. Na komputerze i telefonie,
            bez instalowania czegokolwiek.
          </p>
        </div>
        <DeviceShowcase photos={urls.slice(0, 12)} title={showcaseTitle} />
      </section>

      <section className="home-pricing" id="cennik">
        <h2>Prosty cennik</h2>
        <p>Płacisz tylko za galerie, które oddajesz klientom. Bez abonamentu.</p>
        <PricingPlans />
        <p className="home-pricing-more">
          <Link href="/cennik">Wszystko o pakietach i najczęstsze pytania</Link>
        </p>
      </section>
    </>
  );
}
