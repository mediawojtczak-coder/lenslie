import Link from "@/components/SiteLink";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { PLANS, PERIODS, periodLabel } from "@/lib/plans";
import { PHOTO_TIERS } from "@/lib/pro-plans";

// Strona informacyjna pod wyszukiwania „galeria online dla fotografa”, „galeria zdjęć dla klienta”.
// Na razie tylko po polsku – wersja angielska (/en/client-photo-gallery) będzie osobną stroną z cenami w €/£/US$,
// dlatego tu nie ma hreflang do /en, a pod /en/… strona zwraca 404.
const PATH = "/galeria-online-dla-fotografa";
const URL = `https://www.lenslie.com${PATH}`;
const TITLE = "Galeria online dla fotografa – jak działa i ceny | Lenslie";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: TITLE,
    description:
      "Czym jest galeria online dla fotografa, co dostaje klient, a co fotograf? Link i hasło, wybór zdjęć, pobieranie ZIP, sprzedaż zdjęć. Ceny od 5 zł za galerię, bez abonamentu.",
    alternates: { canonical: PATH, languages: { pl: PATH } },
    openGraph: { type: "article", siteName: "Lenslie", locale: "pl_PL", title: TITLE, url: URL },
  };
}

const zl = (n: number) => `${n} zł`;

export default async function GaleriaOnlineDlaFotografa() {
  // strona tylko po polsku: adres /en/galeria-online-dla-fotografa nie istnieje
  if ((await headers()).get("x-lenslie-lang") === "en") notFound();

  const forClient: [string, string][] = [
    ["Jeden link i hasło", "Klient nie zakłada konta i nie instaluje aplikacji. Otwiera galerię na telefonie albo komputerze."],
    ["Pobieranie całej sesji", "Wszystkie zdjęcia jednym kliknięciem jako ZIP – w pełnej rozdzielczości albo w lżejszej wersji do internetu."],
    ["Ulubione i wybór zdjęć", "Klient zaznacza serduszkiem zdjęcia do obróbki, albumu albo dodatkowego zakupu – Ty widzisz jego wybór w panelu."],
    ["Pokaz slajdów i sekcje", "Sesja podzielona np. na „Przygotowania”, „Ceremonię” i „Przyjęcie”, do obejrzenia jak pokaz slajdów."],
    ["Film na górze galerii", "Film z wesela można dodać do tej samej galerii – podgląd online i pobranie oryginału."],
  ];

  const forPhotographer: [string, string][] = [
    ["Wygląd Twojego studia", "Galeria z Twoim logo, do wyboru motywy, a nawet własna domena, np. galerie.twojestudio.pl."],
    ["Szybkie wgrywanie", "Przez przeglądarkę, aplikację na komputer albo wtyczkę do Lightroom Classic – bez ręcznego eksportu."],
    ["Sprzedaż dodatkowych zdjęć", "Ustalasz, ile zdjęć jest w cenie sesji i ile kosztuje każde kolejne. Pieniądze trafiają do Ciebie, bez prowizji Lenslie."],
    ["Przypomnienie dla klienta", "Tydzień przed końcem dostępu Lenslie wysyła klientowi mail podpisany nazwą Twojego studia."],
    ["Bez kompresji, w Unii Europejskiej", "Oryginały nie są kompresowane, a zdjęcia są przechowywane na serwerach w UE."],
  ];

  const qa: [string, string][] = [
    [
      "Czym jest galeria online dla fotografa?",
      "To prywatna strona internetowa z sesją zdjęciową, którą fotograf udostępnia klientowi przez link i hasło. Klient ogląda w niej zdjęcia, wybiera ulubione i pobiera całą sesję – zamiast dostawać pendrive'a albo link do WeTransfer, który po kilku dniach wygasa.",
    ],
    [
      "Ile kosztuje galeria online w Lenslie?",
      `Konto i panel są bezpłatne. Płacisz za opublikowaną galerię: od ${zl(PLANS[0].prices[1])} (mała galeria, 1 miesiąc dostępu) do ${zl(PLANS[2].prices[12])} (duża galeria ślubna, 12 miesięcy). Przy wielu sesjach możesz wybrać abonament Pro od ${zl(PHOTO_TIERS[0].monthly)} miesięcznie.`,
    ],
    [
      "Czy klient musi zakładać konto?",
      "Nie. Wystarczy link i hasło. Galeria działa w przeglądarce na telefonie, tablecie i komputerze.",
    ],
    [
      "Co się dzieje, gdy kończy się dostęp do galerii?",
      "3 dni przed końcem dostajesz przypomnienie. Możesz przedłużyć galerię jednym kliknięciem albo pozwolić jej wygasnąć – wtedy klient traci dostęp, a zdjęcia są usuwane po 30 dniach.",
    ],
    [
      "Czy w galerii mogę sprzedawać zdjęcia?",
      "Tak. Ustalasz pakiet zdjęć w cenie sesji i cenę każdego kolejnego. Klient zaznacza zdjęcia, galeria liczy dopłatę, a pieniądze trafiają prosto do Ciebie – Lenslie nie pobiera prowizji.",
    ],
    [
      "Jak mogę zapłacić?",
      "BLIK-iem, przelewem lub kartą przez Przelewy24 – za każdą galerię osobno albo z doładowanego salda konta.",
    ],
  ];

  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Lenslie", item: "https://www.lenslie.com/" },
        { "@type": "ListItem", position: 2, name: "Galeria online dla fotografa", item: URL },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: qa.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
    },
  ];

  return (
    <div className="fs alt">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <section className="fs-hero alt-hero">
        <div className="fs-copy">
          <p className="fs-kicker">Galeria online dla fotografa</p>
          <h1>Galeria online dla fotografa – jak działa i ile kosztuje</h1>
          <p className="fs-lead">
            Galeria online to prywatna strona z sesją, którą oddajesz klientowi przez link i hasło. Klient ogląda zdjęcia na telefonie, wybiera ulubione i pobiera
            całość jednym kliknięciem, a Ty masz porządek, swój styl i mniej maili z pytaniem „gdzie są zdjęcia?”.
          </p>
          <div className="fs-ctas">
            <Link href="/rejestracja" className="btn btn-dark">
              Załóż darmowe konto
            </Link>
            <a href="#ceny" className="fs-link">
              Ceny ↓
            </a>
          </div>
        </div>
      </section>

      <section className="alt-features">
        <p className="fs-label">Co dostaje klient</p>
        <ul>
          {forClient.map(([h, p]) => (
            <li key={h}>
              <h3>{h}</h3>
              <p>{p}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="alt-features">
        <p className="fs-label">Co dostaje fotograf</p>
        <ul>
          {forPhotographer.map(([h, p]) => (
            <li key={h}>
              <h3>{h}</h3>
              <p>{p}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="alt-compare" id="ceny">
        <h2 className="fs-label">Ile kosztuje galeria online w Lenslie</h2>
        <div className="alt-table price-table" role="table">
          <div className="alt-row alt-headrow" role="row">
            <span role="columnheader">Pakiet</span>
            {PERIODS.map((p) => (
              <b role="columnheader" key={p}>
                {periodLabel(p)}
              </b>
            ))}
          </div>
          {PLANS.map((plan) => (
            <div className="alt-row" role="row" key={plan.id}>
              <span role="rowheader">
                {plan.name} ({plan.photos}) – {plan.forWhom.toLowerCase()}
              </span>
              {PERIODS.map((p) => (
                <span role="cell" key={p} className={p === 12 ? "alt-us" : undefined}>
                  {zl(plan.prices[p])}
                </span>
              ))}
            </div>
          ))}
        </div>
        <p className="alt-note">
          Cena za jedną galerię i wybrany okres dostępu klienta. Bez abonamentu – konto, panel i wersje robocze są bezpłatne. Przy wielu sesjach: abonament Pro od{" "}
          {zl(PHOTO_TIERS[0].monthly)} miesięcznie ({PHOTO_TIERS[0].gb} GB na wszystkie galerie, dodatki w cenie). <Link href="/cennik">Pełny cennik</Link>
        </p>
      </section>

      <section className="alt-faq">
        <h2>Najczęstsze pytania</h2>
        {qa.map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </section>

      <section className="alt-faq">
        <h2>Przeczytaj też</h2>
        <p>
          <Link href="/poradnik/jak-przekazac-zdjecia-klientowi">Jak przekazać zdjęcia klientowi – WeTransfer, Dysk Google czy galeria online?</Link>
          {" · "}
          <Link href="/alternatywa-pixieset">Alternatywa dla Pixieset po polsku</Link>
          {" · "}
          <Link href="/funkcje/sprzedaz-zdjec">Sprzedaż zdjęć w galerii</Link>
        </p>
      </section>

      <section className="fs-cta">
        <h2>Oddaj następną sesję w galerii online</h2>
        <p>Załóż konto za darmo, przygotuj galerię i zapłać dopiero wtedy, gdy ją publikujesz.</p>
        <div className="fs-ctas center">
          <Link href="/rejestracja" className="btn btn-dark">
            Załóż konto
          </Link>
          <Link href="/cennik" className="fs-link">
            Zobacz cennik
          </Link>
        </div>
      </section>
    </div>
  );
}
