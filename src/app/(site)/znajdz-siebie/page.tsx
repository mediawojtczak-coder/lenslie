import Link from "next/link";
import type { Metadata } from "next";
import { getLang } from "@/lib/lang-server";
import { tr } from "@/lib/lang";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return {
    title: lang === "en" ? "Find yourself in the photos – Lenslie" : "Znajdź siebie na zdjęciach – Lenslie",
    description:
      lang === "en"
        ? "One selfie and every guest sees only the wedding photos they're in. Face recognition for photo galleries."
        : "Jedno selfie i każdy gość widzi tylko zdjęcia z wesela, na których jest. Rozpoznawanie twarzy w galeriach zdjęć.",
  };
}

const GRID = [
  { f: 1, on: true },
  { f: 3, on: false },
  { f: 2, on: true },
  { f: 6, on: false },
  { f: 4, on: true },
  { f: 5, on: false },
  { f: 7, on: true },
  { f: 3, on: false },
  { f: 1, on: true },
];

// Strona reklamowa funkcji „Znajdź siebie na zdjęciach”
export default async function ZnajdzSiebie() {
  const lang = await getLang();
  const t = (pl: string, en: string) => tr(lang, pl, en);

  return (
    <div className="fs">
      <section className="fs-hero">
        <div className="fs-copy">
          <p className="fs-kicker">{t("Nowość w Lenslie", "New in Lenslie")}</p>
          <h1>{t("Jedno selfie. Wszystkie zdjęcia, na których jesteś.", "One selfie. Every photo you're in.")}</h1>
          <p className="fs-lead">
            {t(
              "Galeria z wesela ma 800 zdjęć, a ciocia szuka siebie. Teraz wystarczy, że zrobi selfie – Lenslie w kilka sekund pokaże tylko jej zdjęcia.",
              "The wedding gallery has 800 photos and your aunt is looking for herself. Now she just takes a selfie – Lenslie shows only her photos in seconds.",
            )}
          </p>
          <div className="fs-ctas">
            <Link href="/rejestracja" className="btn btn-dark">
              {t("Wypróbuj w swojej galerii", "Try it in your gallery")}
            </Link>
            <a href="#jak-to-dziala" className="fs-link">
              {t("Jak to działa ↓", "How it works ↓")}
            </a>
          </div>
          <p className="fs-price">{t("49 zł jednorazowo za galerię · bez abonamentu", "PLN 49 one-off per gallery · no subscription")}</p>
        </div>

        <div className="fs-visual" aria-hidden="true">
          <div className="fs-phone">
            <div className="fs-screen">
              <div className="fs-bar">
                <span className="fs-dot" />
                <span>{t("Znaleziono 5 zdjęć z Tobą", "Found 5 photos of you")}</span>
              </div>
              <div className="fs-grid">
                {GRID.map((g, i) => (
                  <span key={i} className={g.on ? "fs-cell on" : "fs-cell"} style={{ backgroundImage: `url(/home/foto-${g.f}.jpg)` }}>
                    {g.on && (
                      <i>
                        <svg viewBox="0 0 24 24" width="12" height="12">
                          <path d="M6 12.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </i>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="fs-selfie">
            <span style={{ backgroundImage: "url(/home/foto-2.jpg)" }} />
            <em>{t("Twoje selfie", "Your selfie")}</em>
          </div>
        </div>
      </section>

      <section className="fs-steps" id="jak-to-dziala">
        <p className="fs-label">{t("Jak to działa", "How it works")}</p>
        <ol>
          <li>
            <span>1</span>
            <h3>{t("Gość klika „Znajdź siebie”", "A guest taps “Find me”")}</h3>
            <p>{t("Przycisk jest na górze galerii – na telefonie i komputerze. Bez logowania i bez aplikacji.", "The button sits at the top of the gallery – on phone and desktop. No login, no app.")}</p>
          </li>
          <li>
            <span>2</span>
            <h3>{t("Robi selfie", "Takes a selfie")}</h3>
            <p>{t("Albo wybiera swoje zdjęcie z telefonu. Rozpoznanie trwa kilka sekund.", "Or picks a photo of themselves from the phone. Matching takes a few seconds.")}</p>
          </li>
          <li>
            <span>3</span>
            <h3>{t("Widzi tylko swoje zdjęcia", "Sees only their photos")}</h3>
            <p>{t("Od razu może je obejrzeć, dodać do ulubionych i pobrać – bez przewijania setek ujęć.", "They can view, favourite and download them right away – no scrolling through hundreds of shots.")}</p>
          </li>
        </ol>
      </section>

      <section className="fs-split">
        <div>
          <p className="fs-label left">{t("Dla fotografa", "For photographers")}</p>
          <h2>{t("Efekt „wow”, o którym goście opowiadają dalej", "A “wow” moment guests tell their friends about")}</h2>
          <ul className="fs-list">
            <li>{t("Wyróżniasz się na tle konkurencji – to funkcja, której większość galerii nie ma.", "You stand out – most gallery platforms don't have this.")}</li>
            <li>{t("Koniec z pytaniami „gdzie są moje zdjęcia?” i wysyłaniem paczek zdjęć osobno każdemu gościowi.", "No more “where are my photos?” and sending separate sets to every guest.")}</li>
            <li>{t("Więcej pobrań i zamówień – goście szybciej znajdują to, co chcą kupić.", "More downloads and orders – guests find what they want to buy faster.")}</li>
            <li>{t("Doliczasz to parze jako dodatek do pakietu – płacisz raz 49 zł, a sprzedajesz za tyle, ile chcesz.", "Add it to the couple's package – you pay PLN 49 once and charge what you like.")}</li>
          </ul>
        </div>
        <div>
          <p className="fs-label left">{t("Dla pary i gości", "For couples and guests")}</p>
          <h2>{t("Każdy znajduje swoje chwile", "Everyone finds their moments")}</h2>
          <ul className="fs-list">
            <li>{t("Babcia, świadkowa, koledzy z pracy – każdy w kilka sekund widzi tylko zdjęcia ze sobą.", "Grandma, the maid of honour, colleagues – everyone sees only their own photos in seconds.")}</li>
            <li>{t("Działa także z linkiem dla gości, który para rozsyła po weselu.", "Works with the guest link the couple shares after the wedding.")}</li>
            <li>{t("Po polsku i po angielsku – dla gości z zagranicy.", "In Polish and English – for guests from abroad.")}</li>
          </ul>
        </div>
      </section>

      <section className="fs-privacy">
        <div className="fs-lock" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="26" height="26">
            <rect x="5" y="10.5" width="14" height="9.5" rx="2" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </div>
        <h2>{t("Prywatność na pierwszym miejscu", "Privacy first")}</h2>
        <div className="fs-privacy-grid">
          <p>
            <strong>{t("Selfie zostaje w telefonie.", "The selfie stays on the phone.")}</strong>{" "}
            {t("Jest analizowane w przeglądarce gościa i nigdy nie trafia na serwer.", "It's analysed in the guest's browser and never reaches a server.")}
          </p>
          <p>
            <strong>{t("Bez zdjęć twarzy w bazie.", "No face photos stored.")}</strong>{" "}
            {t("Zapisujemy tylko liczbowe opisy, potrzebne do porównania – usuwane razem z galerią.", "We store only numeric descriptions needed for matching – deleted with the gallery.")}
          </p>
          <p>
            <strong>{t("Ty decydujesz.", "You're in control.")}</strong>{" "}
            {t("Włączasz funkcję tylko w wybranych galeriach i możesz ją wyłączyć jednym kliknięciem.", "Turn it on only in the galleries you choose and switch it off with one click.")}
          </p>
        </div>
      </section>

      <section className="fs-cta">
        <h2>{t("Pokaż gościom coś, czego jeszcze nie widzieli", "Show guests something they haven't seen before")}</h2>
        <p>{t("49 zł jednorazowo za galerię. Konto i panel są bezpłatne.", "PLN 49 one-off per gallery. Your account and dashboard are free.")}</p>
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
