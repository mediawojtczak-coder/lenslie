import Link from "next/link";
import { FEATURES, FIND_ME_CARD, type L } from "@/lib/features";
import FeatureVisual from "@/components/FeatureVisual";

// Strona główna: „Więcej niż galeria” – karty funkcji z linkami do stron reklamowych
export default function FeatureCards({ lang }: { lang: "pl" | "en" }) {
  const t = (x: L) => x[lang === "en" ? 1 : 0];
  const cards = [
    ...FEATURES.map((f) => ({ href: `/funkcje/${f.slug}`, visual: f.visual, ...f.card })),
    { href: FIND_ME_CARD.href, visual: FIND_ME_CARD.visual, title: FIND_ME_CARD.title, text: FIND_ME_CARD.text, price: FIND_ME_CARD.price },
  ];
  return (
    <section className="home-feats" id="funkcje">
      <p className="fs-label">{lang === "en" ? "More than a gallery" : "Więcej niż galeria"}</p>
      <h2>{lang === "en" ? "Everything a photographer needs, in one place" : "Wszystko, czego potrzebuje fotograf, w jednym miejscu"}</h2>
      <ul>
        {cards.map((c) => (
          <li key={c.href}>
            <Link href={c.href} className="home-feat">
              <span className="home-feat-vis">
                <FeatureVisual visual={c.visual} lang={lang} small />
              </span>
              <span className="home-feat-body">
                <strong>{t(c.title)}</strong>
                <span>{t(c.text)}</span>
                <em>
                  {t(c.price)} <b>›</b>
                </em>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
