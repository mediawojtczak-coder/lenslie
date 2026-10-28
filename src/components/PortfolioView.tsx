"use client";

import { useState, type ReactNode } from "react";
import Lightbox from "@/components/Lightbox";

export type PortfolioData = {
  title: string;
  tagline: string;
  about: string;
  city: string;
  phone: string;
  instagram: string;
  facebook: string;
  services: { name: string; price: string; desc: string }[];
  photos: string[]; // pierwsze = okładka
  events: { id: string; title: string; price: string; free: number }[];
  dark: boolean;
  lang: "pl" | "en";
  logo: string | null;
};

const monogram = (title: string) =>
  title
    .split(/[\s&+-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

// Wygląd mini-strony fotografa – ten sam w podglądzie w panelu i na stronie publicznej
export default function PortfolioView({ d, contact, preview = false }: { d: PortfolioData; contact?: ReactNode; preview?: boolean }) {
  const t = (pl: string, en: string) => (d.lang === "en" ? en : pl);
  const [open, setOpen] = useState<number | null>(null);
  const [cover, portrait, ...rest] = d.photos;
  const gallery = d.photos.length > 2 ? rest : d.photos.slice(1);
  const ig = d.instagram.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, "");
  const fb = d.facebook ? (d.facebook.startsWith("http") ? d.facebook : `https://${d.facebook}`) : "";
  const go = (e: React.MouseEvent) => preview && e.preventDefault();

  return (
    <div className={d.dark ? "lx lx-dark" : "lx"}>
      <header className={cover ? "lx-hero has-cover" : "lx-hero"}>
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="lx-hero-img" />
        )}
        <nav className="lx-nav">
          {d.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={d.logo} alt={d.title} className="lx-logo" />
          ) : (
            <span className="lx-mark">{d.title}</span>
          )}
          <span className="lx-links">
            {gallery.length > 0 && <a href="#portfolio" onClick={go}>Portfolio</a>}
            {d.about && <a href="#o-mnie" onClick={go}>{t("O mnie", "About")}</a>}
            {d.services.length > 0 && <a href="#oferta" onClick={go}>{t("Oferta", "Services")}</a>}
            <a href="#kontakt" className="lx-cta" onClick={go}>
              {t("Kontakt", "Contact")}
            </a>
          </span>
        </nav>
        <div className="lx-hero-in">
          <span className="lx-ring">{monogram(d.title) || "L"}</span>
          {d.city && <p className="lx-kicker">{d.city}</p>}
          <h1>{d.title}</h1>
          <span className="lx-rule" />
          {d.tagline && <p className="lx-tagline">{d.tagline}</p>}
        </div>
        <span className="lx-scroll" aria-hidden="true">
          {t("Przewiń", "Scroll")}
        </span>
      </header>

      {d.about && (
        <section className="lx-about" id="o-mnie">
          {portrait && (
            <figure className="lx-portrait">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={portrait} alt="" loading="lazy" />
            </figure>
          )}
          <div className="lx-about-text">
            <p className="lx-label">{t("O mnie", "About me")}</p>
            <p className="lx-quote">{d.about}</p>
            <p className="lx-sign">{d.title}</p>
          </div>
        </section>
      )}

      {gallery.length > 0 && (
        <section className="lx-sec lx-wide" id="portfolio">
          <p className="lx-label">Portfolio</p>
          <h2 className="lx-h2">{t("Wybrane historie", "Selected stories")}</h2>
          <div className="lx-grid">
            {gallery.map((url, i) => (
              <button key={url + i} type="button" className={`lx-photo ${i % 5 === 0 ? "tall" : ""}`} onClick={() => !preview && setOpen(i)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        </section>
      )}

      {d.services.length > 0 && (
        <section className="lx-sec" id="oferta">
          <p className="lx-label">{t("Oferta", "Services")}</p>
          <h2 className="lx-h2">{t("Pakiety i ceny", "Packages & pricing")}</h2>
          <div className="lx-services">
            {d.services.map((s, i) => (
              <article key={i} className="lx-service">
                <span className="lx-num">{String(i + 1).padStart(2, "0")}</span>
                <h3>{s.name}</h3>
                {s.price && <p className="lx-price">{s.price}</p>}
                {s.desc && <p className="lx-desc">{s.desc}</p>}
              </article>
            ))}
          </div>
        </section>
      )}

      {d.events.length > 0 && (
        <section className="lx-sec">
          <p className="lx-label">{t("Wolne terminy", "Available sessions")}</p>
          <div className="lx-events">
            {d.events.map((e) => (
              <a key={e.id} className="lx-event" href={`/rezerwacja/${e.id}`} onClick={go}>
                <span>
                  <strong>{e.title}</strong>
                  {e.price && <small>{e.price}</small>}
                </span>
                <em>
                  {e.free} {t("wolnych terminów", "free slots")} · {t("Zarezerwuj", "Book")} →
                </em>
              </a>
            ))}
          </div>
        </section>
      )}

      <section className="lx-contact" id="kontakt">
        <div className="lx-contact-in">
          <p className="lx-label">{t("Kontakt", "Contact")}</p>
          <h2>{t("Opowiedz mi o swoim dniu", "Tell me about your day")}</h2>
          <p className="lx-contact-lead">{t("Odpowiadam zwykle w ciągu 24 godzin.", "I usually reply within 24 hours.")}</p>
          {contact}
          <p className="lx-direct">
            {d.phone && <a href={`tel:${d.phone.replace(/\s/g, "")}`} onClick={go}>{d.phone}</a>}
            {ig && (
              <a href={`https://instagram.com/${ig}`} target="_blank" rel="noreferrer" onClick={go}>
                Instagram
              </a>
            )}
            {fb && (
              <a href={fb} target="_blank" rel="noreferrer" onClick={go}>
                Facebook
              </a>
            )}
          </p>
        </div>
      </section>

      <footer className="lx-foot">
        <span className="lx-ring small">{monogram(d.title) || "L"}</span>
        <p>
          © {new Date().getFullYear()} {d.title}
        </p>
        <a href="https://www.lenslie.com" onClick={go}>
          {t("Strona w Lenslie", "Website by Lenslie")}
        </a>
      </footer>

      {open !== null && (
        <Lightbox items={gallery.map((url) => ({ url, name: "" }))} index={open} onIndex={setOpen} onClose={() => setOpen(null)} allowDownload={false} lang={d.lang} />
      )}
    </div>
  );
}
