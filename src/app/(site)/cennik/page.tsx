import type { Metadata } from "next";
import PricingPlans from "@/components/PricingPlans";
import { getLang } from "@/lib/lang-server";

export async function generateMetadata(): Promise<Metadata> {
  const en = (await getLang()) === "en";
  return {
    title: en ? "Pricing – Lenslie" : "Cennik – Lenslie",
    description: en ? "Pay only for the galleries you deliver. No subscription." : "Płacisz tylko za galerie, które oddajesz klientom. Bez abonamentu.",
  };
}

const TXT = {
  pl: {
    h1: "Płacisz za galerię, nie za abonament",
    lead: "Wybierz pakiet dopasowany do sesji i to, jak długo klient ma mieć dostęp do zdjęć. Wszystkie funkcje są w cenie.",
    included: "W każdym pakiecie",
    faq: "Najczęstsze pytania",
    items: [
      "Prywatny link i hasło dla klienta",
      "Pobieranie w pełnej rozdzielczości i w wersji do internetu",
      "Cała sesja jednym kliknięciem jako ZIP",
      "Ulubione zdjęcia klienta, sekcje i pokaz slajdów",
      "Kod QR i gotowa wiadomość dla klienta",
      "Bez reklam i bez kompresji oryginałów",
      "Zdjęcia przechowywane na serwerach w Unii Europejskiej",
    ],
    qa: [
      ["Co się dzieje, gdy minie okres dostępu?", "3 dni przed końcem dostaniesz przypomnienie. Galerię możesz przedłużyć albo pozwolić jej wygasnąć – wtedy klient traci do niej dostęp, a zdjęcia są usuwane po 30 dniach."],
      ["Jak przedłużyć galerię?", "Jednym kliknięciem w panelu – wybierasz kolejny okres dostępu w cenie z cennika."],
      ["Co, jeśli zdjęć będzie więcej, niż zakładałem?", "W każdej chwili zmienisz pakiet na większy i dopłacisz tylko różnicę w cenie."],
      ["Czy goście wesela mogą dodawać swoje zdjęcia?", "Tak – „Zdjęcia od gości” to 99 zł za wydarzenie. Goście skanują kod QR ze stołu i wrzucają zdjęcia z telefonów, bez aplikacji i logowania. Rok dodawania i oglądania, do 30 GB, kartki z kodem QR do druku w zestawie."],
      ["Czy muszę płacić abonament?", "Nie. Płacisz tylko za galerie, które publikujesz. Konto, panel i wersje robocze galerii są bezpłatne."],
      ["Jak mogę zapłacić?", "BLIK-iem, przelewem lub kartą przez Przelewy24 – za każdą galerię osobno albo z doładowanego salda konta (przy doładowaniu 200 zł dostajesz 10 zł gratis)."],
    ],
  },
  en: {
    h1: "Pay per gallery, not a subscription",
    lead: "Choose a plan that fits the session and how long your client should have access. All features are included.",
    included: "Included in every plan",
    faq: "Frequently asked questions",
    items: [
      "Private link and password for your client",
      "Downloads in full resolution and web size",
      "The whole session in one click as a ZIP",
      "Client favourites, sections and slideshow",
      "QR code and a ready-made message for your client",
      "No ads and no compression of originals",
      "Photos stored on servers in the European Union",
    ],
    qa: [
      ["What happens when the access period ends?", "You get a reminder 3 days before. You can extend the gallery or let it expire – the client then loses access and the photos are deleted after 30 days."],
      ["How do I extend a gallery?", "With one click in your dashboard – choose another access period at the listed price."],
      ["What if I have more photos than expected?", "You can upgrade to a bigger plan at any time and only pay the difference."],
      ["Can wedding guests add their own photos?", "Yes – “Guest uploads” costs PLN 99 per event. Guests scan a QR code on the table and upload photos from their phones, no app or login. A year of uploads and viewing, up to 30 GB, printable QR table cards included."],
      ["Do I need a subscription?", "No. You only pay for the galleries you publish. Your account, dashboard and gallery drafts are free."],
      ["How can I pay?", "By BLIK, bank transfer or card via Przelewy24 (in PLN) – per gallery or from your prepaid account balance (top up PLN 200 and get PLN 10 extra)."],
    ],
  },
};

export default async function Cennik() {
  const t = TXT[await getLang()];
  return (
    <div className="pricing">
      <section className="pricing-head">
        <h1>{t.h1}</h1>
        <p>{t.lead}</p>
      </section>

      <PricingPlans />

      <section className="included">
        <h2>{t.included}</h2>
        <ul>
          {t.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="faq">
        <h2>{t.faq}</h2>
        {t.qa.map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </section>
    </div>
  );
}
