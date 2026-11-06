import Link from "next/link";
import type { Metadata } from "next";
import { getLang } from "@/lib/lang-server";
import { tr } from "@/lib/lang";
import { coupleReminderMail, COUPLE_REMIND_DAYS } from "@/lib/couple-mail";
import MailFrame from "@/components/MailFrame";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return {
    title: lang === "en" ? "Automatic reminder for your client – Lenslie" : "Automatyczne przypomnienie dla klienta – Lenslie",
    description:
      lang === "en"
        ? "Enter your client's e-mail once. A week before gallery access ends, Lenslie sends an elegant reminder signed with your studio name."
        : "Wpisz e-mail klienta raz. Tydzień przed końcem dostępu do galerii Lenslie wyśle mu elegancki mail podpisany nazwą Twojego studia.",
    alternates: { canonical: "/przypomnienie" },
  };
}

// Strona reklamowa: automatyczne przypomnienie mailem dla klienta przed końcem dostępu do galerii
export default async function Przypomnienie() {
  const lang = await getLang();
  const en = lang === "en";
  const t = (pl: string, eng: string) => tr(lang, pl, eng);
  const studio = "Studio Aurora";
  const until = new Intl.DateTimeFormat(en ? "en-GB" : "pl-PL", { day: "numeric", month: "long", year: "numeric" }).format(new Date(2027, 5, 21));
  const mail = coupleReminderMail({
    studio,
    title: "Magdalena & Szymon",
    coverUrl: "/home/foto-2.jpg",
    link: "https://www.lenslie.com/galeria/…",
    password: "lato2027",
    until,
    en,
    daysLeft: COUPLE_REMIND_DAYS,
    canExtend: true,
    offUrl: "#",
  });

  return (
    <div className="fs rm">
      <section className="fs-hero">
        <div className="fs-copy">
          <p className="fs-kicker">{t("Nowość w Lenslie", "New in Lenslie")}</p>
          <h1>{t("Twój klient nie przegapi swoich zdjęć.", "Your client won't miss their photos.")}</h1>
          <p className="fs-lead">
            {t(
              `Wpisujesz e-mail klienta na kafelku galerii – i to wszystko. ${COUPLE_REMIND_DAYS} dni przed końcem dostępu Lenslie wyśle mu elegancki mail z okładką galerii, hasłem i przyciskiem do zdjęć, podpisany nazwą Twojego studia.`,
              `Enter your client's e-mail on the gallery tile – that's it. ${COUPLE_REMIND_DAYS} days before access ends, Lenslie sends them an elegant e-mail with the gallery cover, password and a button to the photos, signed with your studio name.`,
            )}
          </p>
          <div className="fs-ctas">
            <Link href="/rejestracja" className="btn btn-dark">
              {t("Załóż konto", "Sign up")}
            </Link>
            <a href="#jak-to-dziala" className="fs-link">
              {t("Jak to działa ↓", "How it works ↓")}
            </a>
          </div>
          <p className="fs-price">{t("W cenie każdej galerii · bez dopłat", "Included with every gallery · no extra cost")}</p>
        </div>

        <div className="rm-visual" aria-hidden="true">
          <MailFrame html={mail.html} from={`${studio} ${en ? "via" : "przez"} Lenslie`} fromLabel={t("Od", "From")} subject={mail.subject} maxHeight={560} />
          <div className="rm-chip">
            <svg viewBox="0 0 24 24" width="15" height="15">
              <rect x="3.5" y="6" width="17" height="12" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
              <path d="m4 7 8 6 8-6" fill="none" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            <span>magda@…</span>
            <b>
              <svg viewBox="0 0 24 24" width="11" height="11">
                <path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              14.06.2027
            </b>
          </div>
        </div>
      </section>

      <section className="fs-steps" id="jak-to-dziala">
        <p className="fs-label">{t("Jak to działa", "How it works")}</p>
        <ol>
          <li>
            <span>1</span>
            <h3>{t("Wpisujesz e-mail klienta", "Enter the client's e-mail")}</h3>
            <p>{t("Na kafelku galerii w panelu. Zapisuje się sam – bez przycisków. Obok od razu widzisz dzień wysyłki.", "On the gallery tile in your dashboard. It saves itself – no buttons. The send date appears right next to it.")}</p>
          </li>
          <li>
            <span>2</span>
            <h3>{t("Lenslie pilnuje terminu", "Lenslie watches the date")}</h3>
            <p>
              {t(
                `${COUPLE_REMIND_DAYS} dni przed końcem dostępu wysyłamy mail automatycznie. Nie musisz niczego pamiętać ani ustawiać.`,
                `${COUPLE_REMIND_DAYS} days before access ends we send the e-mail automatically. Nothing to remember or set up.`,
              )}
            </p>
          </li>
          <li>
            <span>3</span>
            <h3>{t("Klient wraca po zdjęcia", "The client comes back")}</h3>
            <p>{t("Otwiera galerię jednym kliknięciem, pobiera zdjęcia, a jeśli potrzebuje więcej czasu – sam przedłuża dostęp.", "Opens the gallery in one click, downloads the photos and – if they need more time – extends access themselves.")}</p>
          </li>
        </ol>
      </section>

      <section className="fs-split">
        <div>
          <p className="fs-label left">{t("Dla fotografa", "For photographers")}</p>
          <h2>{t("Koniec z „a można jeszcze pobrać?”", "No more “can we still download them?”")}</h2>
          <ul className="fs-list">
            <li>{t("Klient dostaje przypomnienie, zanim galeria wygaśnie – a nie wiadomość do Ciebie tydzień po.", "Your client is reminded before the gallery expires – not messaging you a week after.")}</li>
            <li>{t("Profesjonalna obsługa bez Twojej pracy: wpisujesz adres raz i zapominasz.", "Professional service without the effort: enter the address once and forget about it.")}</li>
            <li>{t("Odpowiedź klienta na mail trafia prosto do Twojej skrzynki.", "If the client replies, it goes straight to your inbox.")}</li>
            <li>{t("Data wysyłki widoczna na kafelku – zawsze wiesz, kiedy wyjdzie mail.", "The send date is shown on the tile – you always know when it goes out.")}</li>
          </ul>
        </div>
        <div>
          <p className="fs-label left">{t("Dla klienta", "For your client")}</p>
          <h2>{t("Mail, który wygląda jak zaproszenie", "An e-mail that feels like an invitation")}</h2>
          <ul className="fs-list">
            <li>{t("Okładka galerii, złote akcenty i szlachetna typografia – w stylu albumu ślubnego.", "The gallery cover, gold accents and fine typography – in the style of a wedding album.")}</li>
            <li>{t("Link, hasło i termin dostępu w jednym miejscu – bez szukania starych wiadomości.", "Link, password and access date in one place – no digging through old messages.")}</li>
            <li>{t("Jeden mail, bez spamu. Klient może wyłączyć przypomnienie jednym kliknięciem.", "One e-mail, no spam. The client can switch the reminder off in one click.")}</li>
            <li>{t("Po polsku albo po angielsku – w języku galerii.", "In Polish or English – in the gallery's language.")}</li>
          </ul>
        </div>
      </section>

      <section className="fs-privacy">
        <div className="fs-lock" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="26" height="26">
            <path d="M12 3.5 14.4 9l5.9.5-4.5 3.9 1.4 5.8L12 16.1l-5.2 3.1 1.4-5.8-4.5-3.9 5.9-.5L12 3.5Z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
          </svg>
        </div>
        <h2>{t("Twoja marka, nie nasza", "Your brand, not ours")}</h2>
        <div className="fs-privacy-grid">
          <p>
            <strong>{t("Podpisany Twoim studiem.", "Signed by your studio.")}</strong>{" "}
            {t("Nadawca to „Twoje Studio przez Lenslie”, a nazwa studia jest na górze i w podpisie maila.", "The sender reads “Your Studio via Lenslie”, with your studio name at the top and in the signature.")}
          </p>
          <p>
            <strong>{t("Okładka Twojej galerii.", "Your gallery's cover.")}</strong>{" "}
            {t("Mail pokazuje zdjęcie, które wybrałeś na okładkę – klient od razu wie, o którą sesję chodzi.", "The e-mail shows the photo you chose as the cover – the client knows at once which shoot it's about.")}
          </p>
          <p>
            <strong>{t("Bezpieczne adresy.", "Addresses kept safe.")}</strong>{" "}
            {t("E-mail klienta służy tylko do tego przypomnienia i znika razem z galerią.", "The client's e-mail is used only for this reminder and is deleted with the gallery.")}
          </p>
        </div>
      </section>

      <section className="fs-cta">
        <h2>{t("Zadbaj o klienta także po oddaniu zdjęć", "Look after clients even after delivery")}</h2>
        <p>{t("Przypomnienie jest w cenie każdej galerii. Konto i panel są bezpłatne.", "The reminder is included with every gallery. Your account and dashboard are free.")}</p>
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
