import Link from "next/link";
import { langAlternates } from "@/lib/en-paths";
import type { Metadata } from "next";
import { getLang } from "@/lib/lang-server";
import { tr } from "@/lib/lang";

export async function generateMetadata(): Promise<Metadata> {
  const en = (await getLang()) === "en";
  return {
    title: en ? "Pixieset alternative – client galleries without a subscription | Lenslie" : "Alternatywa dla Pixieset po polsku – galerie online Lenslie",
    description: en
      ? "Looking for a Pixieset alternative? Lenslie client galleries: pay per gallery instead of a monthly subscription, client proofing and photo sales with no commission, album designer and guest uploads."
      : "Szukasz alternatywy dla Pixieset? Lenslie to polska galeria zdjęć online dla fotografów: płacisz za galerię w złotówkach, BLIK, polski panel i galeria dla klienta, serwery w UE.",
    alternates: langAlternates("/alternatywa-pixieset", (en ? "en" : "pl")),
  };
}

// Strona porównawcza pod wyszukiwania „pixieset alternatywa”, „pixieset po polsku”
export default async function AlternatywaPixieset() {
  const lang = await getLang();
  const t = (pl: string, en: string) => tr(lang, pl, en);

  const rows: [string, string, string][] = [
    // język i waluta to atut tylko dla polskich fotografów – w wersji angielskiej pomijamy (do czasu płatności w EUR/USD)
    ...(lang === "en"
      ? []
      : ([
          ["Język panelu i galerii", "Polski i angielski", "Angielski"],
          ["Waluta i płatności", "Złotówki – BLIK, przelew, karta (Przelewy24)", "Dolary amerykańskie, karta"],
        ] as [string, string, string][])),
    [t("Model rozliczenia", "Pricing model"), t("Płacisz za galerię albo abonament Pro – Ty wybierasz", "Pay per gallery or a Pro plan – your choice"), t("Abonament miesięczny lub roczny", "Monthly or yearly subscription")],
    [t("Darmowy start", "Free start"), t("Konto, panel i wersje robocze bez opłat", "Account, dashboard and drafts free"), t("Darmowy plan 3 GB", "Free 3 GB plan")],
    [t("Prowizja od sprzedaży zdjęć", "Commission on photo sales"), t("Pieniądze od klienta trafiają prosto do Ciebie", "Client money goes straight to you"), t("15% na darmowym planie", "15% on the free plan")],
    [t("Wsparcie", "Support"), t("Po polsku, bezpośrednio od twórców", "Straight from the makers, in English or Polish"), t("Po angielsku", "In English")],
  ];

  const features: [string, string][] = [
    [t("Galeria dla klienta na link i hasło", "Client gallery with a link and password"), t("Elegancka galeria z Twoim logo, ulubionymi zdjęciami, pokazem slajdów i pobieraniem całej sesji jako ZIP.", "An elegant gallery with your logo, favourites, a slideshow and the whole session as a ZIP.")],
    [t("Wybór i sprzedaż zdjęć", "Proofing and photo sales"), t("Klient zaznacza zdjęcia, zamawia dodatkowe, a Ty udostępniasz je bez znaku wodnego jednym kliknięciem.", "Clients pick photos, order extras, and you unlock them without a watermark in one click.")],
    [t("Zdjęcia od gości wesela", "Wedding guest uploads"), t("Goście skanują kod QR ze stołu i wrzucają zdjęcia z telefonów – bez aplikacji.", "Guests scan a QR code on the table and upload from their phones – no app.")],
    [t("Wtyczka do Lightrooma", "Lightroom plugin"), t("Eksportujesz zdjęcia prosto do galerii, bez ręcznego wgrywania.", "Export straight to the gallery, no manual uploads.")],
    [t("Projektor albumów i druk", "Album designer and print"), t("Klient wybiera zdjęcia, Ty składasz album i zamawiasz druk.", "The client picks photos, you design the album and order the print.")],
    [t("Własna domena", "Your own domain"), t("Galerie pod adresem Twojego studia, np. galerie.twojestudio.pl.", "Galleries on your studio's address, e.g. galleries.yourstudio.com.")],
  ];

  const qa: [string, string][] = [
    [t("Czy mogę przenieść się z Pixieset?", "Can I move from Pixieset?"), t("Tak. Pobierasz zdjęcia z Pixieset i wgrywasz je do Lenslie – przez przeglądarkę, aplikację na komputer albo wtyczkę Lightroom. Nowe sesje możesz od razu oddawać w Lenslie, a stare galerie zostawić do wygaśnięcia.", "Yes. Download your photos from Pixieset and upload them to Lenslie – in the browser, the desktop app or the Lightroom plugin. Deliver new sessions in Lenslie right away and let old galleries expire.")],
    [t("Czy klient musi zakładać konto?", "Does my client need an account?"), t("Nie. Klient dostaje link i hasło – otwiera galerię na telefonie albo komputerze i pobiera zdjęcia.", "No. Your client gets a link and password – opens the gallery on a phone or computer and downloads the photos.")],
    [t("Ile kosztuje Lenslie?", "How much does Lenslie cost?"), t("Konto jest darmowe. Płacisz za opublikowaną galerię według pakietu albo wybierasz abonament Pro, jeśli robisz dużo sesji. Szczegóły są w cenniku.", "The account is free. You pay per published gallery or choose a Pro plan if you shoot a lot. See pricing for details.")],
    [t("Czy Lenslie nadaje się do fotografii ślubnej?", "Is Lenslie good for wedding photography?"), t("Tak – większość naszych fotografów to fotografowie ślubni, eventowi i rodzinni. Galeria obsługuje duże sesje, filmy i zdjęcia od gości.", "Yes – most of our photographers shoot weddings, events and families. Galleries handle big sessions, videos and guest uploads.")],
  ];

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: qa.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };

  return (
    <div className="fs alt">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <section className="fs-hero alt-hero">
        <div className="fs-copy">
          <p className="fs-kicker">{t("Alternatywa dla Pixieset", "A Pixieset alternative")}</p>
          <h1>{t("Galerie dla klientów jak w Pixieset – tylko po polsku i w złotówkach.", "Client galleries like Pixieset – without the monthly subscription.")}</h1>
          <p className="fs-lead">
            {t(
              "Lenslie to polska galeria zdjęć online dla fotografów. Oddajesz sesję na link i hasło, klient wybiera i pobiera zdjęcia, a Ty płacisz BLIK-iem za galerię – bez abonamentu w dolarach.",
              "Lenslie is an online photo gallery for photographers. Deliver a session with a link and password, your client picks and downloads photos, and you pay only for the galleries you publish – no monthly plan.",
            )}
          </p>
          <div className="fs-ctas">
            <Link href="/rejestracja" className="btn btn-dark">
              {t("Załóż darmowe konto", "Create a free account")}
            </Link>
            <a href="#porownanie" className="fs-link">
              {t("Porównanie ↓", "Comparison ↓")}
            </a>
          </div>
        </div>
      </section>

      <section className="alt-compare" id="porownanie">
        <p className="fs-label">{t("Lenslie i Pixieset – porównanie", "Lenslie vs Pixieset")}</p>
        <div className="alt-table" role="table">
          <div className="alt-row alt-headrow" role="row">
            <span role="columnheader" />
            <b role="columnheader">Lenslie</b>
            <b role="columnheader">Pixieset</b>
          </div>
          {rows.map(([k, a, b]) => (
            <div className="alt-row" role="row" key={k}>
              <span role="rowheader">{k}</span>
              <span role="cell" className="alt-us">{a}</span>
              <span role="cell">{b}</span>
            </div>
          ))}
        </div>
        <p className="alt-note">{t("Dane o Pixieset według publicznych informacji z 2026 roku; ceny i plany mogą się zmieniać.", "Pixieset details based on public information from 2026; prices and plans may change.")}</p>
      </section>

      <section className="alt-features">
        <p className="fs-label">{t("Wszystko, czego potrzebuje fotograf", "Everything a photographer needs")}</p>
        <ul>
          {features.map(([h, p]) => (
            <li key={h}>
              <h3>{h}</h3>
              <p>{p}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="alt-faq">
        <h2>{t("Najczęstsze pytania", "Frequently asked questions")}</h2>
        {qa.map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </section>

      <section className="fs-cta">
        <h2>{t("Sprawdź Lenslie przy następnej sesji", "Try Lenslie with your next session")}</h2>
        <p>{t("Konto i panel są bezpłatne. Płacisz dopiero, gdy publikujesz galerię dla klienta.", "Your account and dashboard are free. You only pay when you publish a gallery.")}</p>
        <div className="fs-ctas center">
          <Link href="/rejestracja" className="btn btn-dark">
            {t("Załóż konto", "Sign up")}
          </Link>
          <Link href="/cennik" className="fs-link">
            {t("Zobacz cennik", "See pricing")}
          </Link>
        </div>
      </section>
    </div>
  );
}
