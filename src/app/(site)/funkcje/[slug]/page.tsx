import Link from "next/link";
import { usdify } from "@/lib/lang";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getLang } from "@/lib/lang-server";
import { FEATURES, getFeature, FIND_ME_CARD, type L } from "@/lib/features";
import FeatureVisual from "@/components/FeatureVisual";

export function generateStaticParams() {
  return FEATURES.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const f = getFeature(slug);
  const lang = await getLang();
  if (!f) return {};
  const i = lang === "en" ? 1 : 0;
  return { title: `${f.card.title[i]} – Lenslie`, description: f.card.text[i] };
}

// Strona reklamowa jednej funkcji Lenslie
export default async function FeaturePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const f = getFeature(slug);
  if (!f) notFound();
  const lang = await getLang();
  const t = (x: L) => (lang === "en" ? usdify(x[1]) : x[0]);
  const others = [
    ...FEATURES.filter((x) => x.slug !== f.slug).map((x) => ({ href: `/funkcje/${x.slug}`, title: x.card.title, price: x.card.price })),
    { href: FIND_ME_CARD.href, title: FIND_ME_CARD.title, price: FIND_ME_CARD.price },
  ];

  return (
    <div className="fs feat">
      <section className="fs-hero">
        <div className="fs-copy">
          <p className="fs-kicker">{t(f.kicker)}</p>
          <h1>{t(f.title)}</h1>
          <p className="fs-lead">{t(f.lead)}</p>
          <div className="fs-ctas">
            <Link href="/rejestracja" className="btn btn-dark">
              {lang === "en" ? "Create a free account" : "Załóż darmowe konto"}
            </Link>
            <a href="#jak-to-dziala" className="fs-link">
              {lang === "en" ? "How it works ↓" : "Jak to działa ↓"}
            </a>
          </div>
          <p className="fs-price">{t(f.price)}</p>
        </div>
        <div className="feat-visual">
          <FeatureVisual visual={f.visual} lang={lang} />
        </div>
      </section>

      <section className="fs-steps" id="jak-to-dziala">
        <p className="fs-label">{lang === "en" ? "How it works" : "Jak to działa"}</p>
        <ol>
          {f.steps.map((s, i) => (
            <li key={i}>
              <span>{i + 1}</span>
              <h3>{t(s.title)}</h3>
              <p>{t(s.text)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="fs-split">
        <div>
          <p className="fs-label left">{lang === "en" ? "For photographers" : "Dla fotografa"}</p>
          <ul className="fs-list">
            {f.forPhotographer.map((x, i) => (
              <li key={i}>{t(x)}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="fs-label left">{t(f.forClient.title)}</p>
          <ul className="fs-list">
            {f.forClient.items.map((x, i) => (
              <li key={i}>{t(x)}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="fs-privacy">
        <h2>{t(f.band.title)}</h2>
        <div className="fs-privacy-grid">
          {f.band.points.map((p, i) => (
            <p key={i}>
              <strong>{t(p.title)}</strong> {t(p.text)}
            </p>
          ))}
        </div>
      </section>

      <section className="fs-cta">
        <h2>{t(f.cta.title)}</h2>
        <p>{t(f.cta.text)}</p>
        <div className="fs-ctas center">
          <Link href="/rejestracja" className="btn btn-dark">
            {lang === "en" ? "Sign up" : "Załóż konto"}
          </Link>
          <Link href="/cennik" className="fs-link">
            {lang === "en" ? "See pricing" : "Zobacz cennik"}
          </Link>
        </div>
      </section>

      <section className="feat-more">
        <p className="fs-label">{lang === "en" ? "More in Lenslie" : "Więcej w Lenslie"}</p>
        <ul>
          {others.map((o) => (
            <li key={o.href}>
              <Link href={o.href}>
                <strong>{t(o.title)}</strong>
                <small>{t(o.price)}</small>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
