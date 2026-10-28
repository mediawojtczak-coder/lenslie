import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSiteBySlug, photoUrls, portfolioActive } from "@/lib/portfolio";
import { getUserBrand } from "@/lib/profiles";
import { getUser } from "@/lib/supabase/server";
import { listUserEvents, listReservations, slotPast } from "@/lib/bookings";
import PortfolioGallery from "./PortfolioGallery";
import ContactForm from "./ContactForm";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const s = await getSiteBySlug(slug);
  return s ? { title: s.title || "Lenslie", description: s.tagline || undefined } : {};
}

// Publiczna mini-strona portfolio fotografa
export default async function Portfolio({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = await getSiteBySlug(slug);
  if (!s) notFound();
  const { user } = await getUser().catch(() => ({ user: null }));
  const owner = user?.id === s.uid;
  const active = portfolioActive(s);
  const t = (pl: string, en: string) => (s.lang === "en" ? en : pl);
  if (!active && !owner) {
    return (
      <main className="pf pf-off">
        <h1>{s.title}</h1>
        <p>{t("Strona jest chwilowo niedostępna.", "This page is temporarily unavailable.")}</p>
      </main>
    );
  }
  const [photos, brand, events] = await Promise.all([
    s.consentAt ? photoUrls(s).catch(() => []) : Promise.resolve([]),
    getUserBrand(s.uid).catch(() => null),
    s.showBookings ? listUserEvents(s.uid).catch(() => []) : Promise.resolve([]),
  ]);
  const openEvents = (
    await Promise.all(
      events
        .filter((e) => e.open)
        .map(async (e) => {
          const res = await listReservations(e.id).catch(() => new Map());
          const free = e.slots.filter((x) => !slotPast(x) && !res.has(x.id)).length;
          return { id: e.id, title: e.title, price: e.price, free };
        }),
    )
  ).filter((e) => e.free > 0);
  const [cover, ...rest] = photos;
  const ig = s.instagram.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, "");
  const fb = s.facebook ? (s.facebook.startsWith("http") ? s.facebook : `https://${s.facebook}`) : "";

  return (
    <main className={s.dark ? "pf pf-dark" : "pf"}>
      {owner && !active && (
        <p className="preview-banner">
          {t("Podgląd – strona nie jest jeszcze włączona.", "Preview – the website is not active yet.")} <a href="/panel/strona">{t("Wróć do panelu", "Back to dashboard")}</a>
        </p>
      )}
      {owner && !s.consentAt && (
        <p className="preview-banner">{t("Zdjęcia są ukryte, dopóki nie potwierdzisz zgód osób na zdjęciach.", "Photos are hidden until you confirm consent from the people in them.")}</p>
      )}

      <header className={cover ? "pf-hero has-cover" : "pf-hero"}>
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover.url} alt="" className="pf-hero-img" />
        )}
        <nav className="pf-nav">
          {brand?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logoUrl} alt={s.title} className="pf-logo" />
          ) : (
            <span className="pf-mark">{s.title}</span>
          )}
          <span className="pf-links">
            {rest.length > 0 && <a href="#portfolio">Portfolio</a>}
            {s.about && <a href="#o-mnie">{t("O mnie", "About")}</a>}
            {s.services.length > 0 && <a href="#cennik">{t("Cennik", "Pricing")}</a>}
            <a href="#kontakt" className="pf-cta">{t("Kontakt", "Contact")}</a>
          </span>
        </nav>
        <div className="pf-hero-in">
          {s.city && <p className="pf-kicker">{s.city}</p>}
          <h1>{s.title}</h1>
          {s.tagline && <p className="pf-tagline">{s.tagline}</p>}
        </div>
      </header>

      {s.about && (
        <section className="pf-sec pf-about" id="o-mnie">
          <p className="pf-label">{t("O mnie", "About me")}</p>
          <p className="pf-about-text">{s.about}</p>
        </section>
      )}

      {rest.length > 0 && (
        <section className="pf-sec pf-wide" id="portfolio">
          <p className="pf-label">Portfolio</p>
          <PortfolioGallery photos={rest.map((p) => p.url)} lang={s.lang} />
        </section>
      )}

      {s.services.length > 0 && (
        <section className="pf-sec" id="cennik">
          <p className="pf-label">{t("Cennik", "Pricing")}</p>
          <div className="pf-services">
            {s.services.map((x, i) => (
              <article key={i} className="pf-service">
                <h3>{x.name}</h3>
                {x.price && <p className="pf-price">{x.price}</p>}
                {x.desc && <p>{x.desc}</p>}
              </article>
            ))}
          </div>
        </section>
      )}

      {openEvents.length > 0 && (
        <section className="pf-sec">
          <p className="pf-label">{t("Wolne terminy", "Available sessions")}</p>
          <div className="pf-services">
            {openEvents.map((e) => (
              <a key={e.id} className="pf-service pf-event" href={`/rezerwacja/${e.id}`}>
                <h3>{e.title}</h3>
                {e.price && <p className="pf-price">{e.price}</p>}
                <p>
                  {e.free} {t("wolnych terminów", "free slots")} · {t("Zarezerwuj ›", "Book ›")}
                </p>
              </a>
            ))}
          </div>
        </section>
      )}

      <section className="pf-sec pf-contact" id="kontakt">
        <p className="pf-label">{t("Kontakt", "Contact")}</p>
        <h2>{t("Opowiedz mi o swoim dniu", "Tell me about your day")}</h2>
        <ContactForm slug={s.slug} lang={s.lang} />
        <p className="pf-direct">
          {s.phone && <a href={`tel:${s.phone.replace(/\s/g, "")}`}>{s.phone}</a>}
          {ig && (
            <a href={`https://instagram.com/${ig}`} target="_blank" rel="noreferrer">
              Instagram
            </a>
          )}
          {fb && (
            <a href={fb} target="_blank" rel="noreferrer">
              Facebook
            </a>
          )}
        </p>
      </section>

      <footer className="pf-foot">
        © {new Date().getFullYear()} {s.title} · <a href="https://www.lenslie.com">{t("Strona w Lenslie", "Website by Lenslie")}</a>
      </footer>
    </main>
  );
}
