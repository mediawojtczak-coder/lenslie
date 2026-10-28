import Link from "next/link";
import { Great_Vibes } from "next/font/google";
import SideLogout from "@/components/SideLogout";
import FancyQr from "@/components/FancyQr";
import { getLang } from "@/lib/lang-server";
import { tr, money } from "@/lib/lang";
import { GUEST_PRICE, GUEST_LIMIT_GB } from "@/lib/guest-events";
import CreateGuestEvent from "../CreateGuestEvent";

const script = Great_Vibes({ weight: "400", subsets: ["latin", "latin-ext"], variable: "--font-script", display: "swap" });

// Strona sprzedażowa „Zdjęcia od gości” (kody QR na stoły) w panelu fotografa
export default async function GoscieOferta() {
  const lang = await getLang();
  const t = (pl: string, en: string) => tr(lang, pl, en);
  const price = money(GUEST_PRICE, lang);

  return (
    <div className="app-body">
      <aside className="app-side">
        <Link href="/panel/goscie" className="link-quiet back-link">← {t("Zdjęcia od gości", "Guest uploads")}</Link>
        <CreateGuestEvent label={t("Utwórz wydarzenie", "Create an event")} className="btn btn-wide" />
        <nav aria-label={t("Zdjęcia od gości", "Guest uploads")}>
          <Link href="/panel/goscie" className="side-link">{t("Moje wydarzenia", "My events")}</Link>
          <span className="side-link active">{t("Oferta i cennik", "Offer & pricing")}</span>
        </nav>
        <SideLogout />
      </aside>
      <main className={`app-main ${script.variable}`}>
        <div className="qo">
          <section className="qo-hero">
            <div className="qo-copy">
              <p className="fs-kicker">{t("Zdjęcia od gości", "Guest uploads")}</p>
              <h1>{t("Setki zdjęć z wesela, których nie zrobi żaden fotograf", "Hundreds of wedding photos no photographer could take")}</h1>
              <p className="qo-lead">
                {t(
                  "Na każdym stole elegancka kartka z kodem QR. Goście skanują go telefonem i wrzucają swoje zdjęcia i filmy – prosto do jednej galerii pary. Bez aplikacji, bez logowania, bez szukania po grupach na Messengerze.",
                  "An elegant QR card on every table. Guests scan it and upload their photos and videos straight into one gallery for the couple. No app, no login, no chasing pictures in group chats.",
                )}
              </p>
              <div className="fs-ctas">
                <CreateGuestEvent label={t(`Utwórz wydarzenie · ${price}`, `Create an event · ${price}`)} className="btn btn-dark" />
<Link href="#jak" className="fs-link">
                  {t("Jak to działa ›", "How it works ›")}
                </Link>
              </div>
              <p className="fs-price">{t("Jednorazowo za wesele · rok dodawania i oglądania · bez abonamentu", "One-off per wedding · a year of uploads and viewing · no subscription")}</p>
            </div>

            <div className="qo-visual" aria-hidden="true">
              <div className="qo-card">
                <div className="qo-card-frame">
                  <p className="qc-kicker">{t("Podzielcie się zdjęciami", "Share your photos")}</p>
                  <h3 className="qc-names">Anna &amp; Marek</h3>
                  <p className="qc-date">
                    <span />
                    14 · 09 · 2026
                    <span />
                  </p>
                  <div className="qc-code">
                    <i className="qc-corner tl" />
                    <i className="qc-corner tr" />
                    <i className="qc-corner bl" />
                    <i className="qc-corner br" />
                    <FancyQr text="https://www.lenslie.com/goscie/demo" className="qc-qr" />
                  </div>
                  <p className="qc-thanks">{t("Dziękujemy", "Thank you")}</p>
                </div>
              </div>
              <div className="qo-phone">
                <div className="qo-screen">
                  <p className="qo-names">Anna &amp; Marek</p>
                  <span className="qo-btn">{t("Dodaj zdjęcia i filmy", "Add photos & videos")}</span>
                  <div className="qo-grid">
                    {[1, 4, 2, 7, 3, 6].map((n, i) => (
                      <span key={i} style={{ backgroundImage: `url(/home/foto-${n}.jpg)` }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="fs-steps" id="jak">
            <p className="fs-label">{t("Jak to działa", "How it works")}</p>
            <ol>
              <li>
                <span>1</span>
                <h3>{t("Tworzysz wydarzenie", "Create the event")}</h3>
                <p>{t("Imiona pary, data, powitanie i zdjęcie na okładkę. Zajmuje to dwie minuty.", "Couple's names, date, welcome text and a cover photo. Takes two minutes.")}</p>
              </li>
              <li>
                <span>2</span>
                <h3>{t("Drukujesz kartki na stoły", "Print the table cards")}</h3>
                <p>{t("Gotowe, eleganckie kartki ze złotą ramką i kodem QR – 4 na stronie A4.", "Ready, elegant cards with a gold frame and QR code – 4 per A4 page.")}</p>
              </li>
              <li>
                <span>3</span>
                <h3>{t("Goście dodają zdjęcia", "Guests add photos")}</h3>
                <p>{t("Skanują kod aparatem i wybierają zdjęcia i filmy z telefonu. Para widzi je od razu.", "They scan the code with their camera and pick photos and videos. The couple sees them right away.")}</p>
              </li>
            </ol>
          </section>

          <section className="qo-included">
            <div>
              <p className="fs-label left">{t("W cenie", "Included")}</p>
              <h2>{t("Wszystko, czego potrzeba w dniu ślubu", "Everything you need on the day")}</h2>
            </div>
            <ul className="fs-list">
              <li>{t("Strona dla gości w ślubnym stylu – z imionami pary, datą i okładką", "A wedding-style page for guests – with names, date and cover")}</li>
              <li>{t("Eleganckie kartki z kodem QR do druku (PDF prosto z przeglądarki)", "Elegant printable QR cards (print straight from the browser)")}</li>
              <li>{t(`Zdjęcia i filmy w oryginalnej jakości, do ${GUEST_LIMIT_GB} GB`, `Photos and videos in original quality, up to ${GUEST_LIMIT_GB} GB`)}</li>
              <li>{t("Rok dodawania i oglądania, potem 30 dni na pobranie wszystkiego", "A year of uploads and viewing, then 30 days to download everything")}</li>
              <li>{t("Pobieranie całości jednym kliknięciem (ZIP)", "Download everything in one click (ZIP)")}</li>
              <li>{t("Moderacja – usuwasz niechciane zdjęcia", "Moderation – remove unwanted photos")}</li>
              <li>{t("Wersja polska i angielska dla gości z zagranicy", "Polish and English for guests from abroad")}</li>
            </ul>
          </section>

          <section className="qo-sell">
            <h2>{t("Doliczaj to parom do pakietu", "Add it to your couples' packages")}</h2>
            <p>
              {t(
                `Płacisz ${price} raz za wesele, a parze możesz to sprzedać jako dodatek – np. za 199–299 zł. Pary uwielbiają widzieć wesele oczami swoich gości.`,
                `You pay ${price} once per wedding and can offer it to the couple as an add-on. Couples love seeing their wedding through their guests' eyes.`,
              )}
            </p>
            <CreateGuestEvent label={t("Utwórz pierwsze wydarzenie", "Create your first event")} className="btn btn-dark" />
          </section>

          <section className="qo-faq">
            <p className="fs-label">{t("Pytania", "Questions")}</p>
            <details>
              <summary>{t("Czy goście muszą coś instalować?", "Do guests need to install anything?")}</summary>
              <p>{t("Nie. Kod QR otwiera stronę w przeglądarce telefonu – wystarczy kliknąć „Dodaj zdjęcia i filmy”.", "No. The QR code opens a page in the phone's browser – they just tap “Add photos and videos”.")}</p>
            </details>
            <details>
              <summary>{t("Kiedy płacę?", "When do I pay?")}</summary>
              <p>{t(`Wydarzenie tworzysz za darmo i możesz je podejrzeć. Płacisz ${price} przy aktywacji – z salda albo BLIK-iem.`, `Creating and previewing the event is free. You pay ${price} when activating – from your balance or by card/BLIK.`)}</p>
            </details>
            <details>
              <summary>{t("Czy zdjęcia trafiają do galerii klienta?", "Do the photos go into the client gallery?")}</summary>
              <p>{t("To osobna galeria gości, z własnym linkiem. Para i Ty możecie pobrać wszystko jednym kliknięciem.", "It's a separate guest gallery with its own link. You and the couple can download everything in one click.")}</p>
            </details>
            <details>
              <summary>{t("Co z niechcianymi zdjęciami?", "What about unwanted photos?")}</summary>
              <p>{t("W panelu widzisz wszystko, co dodali goście, i usuwasz pojedyncze zdjęcia lub filmy.", "In your dashboard you see everything guests added and can delete single photos or videos.")}</p>
            </details>
          </section>
        </div>
      </main>
    </div>
  );
}
