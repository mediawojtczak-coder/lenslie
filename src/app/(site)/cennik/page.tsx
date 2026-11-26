import type { Metadata } from "next";
import { langAlternates } from "@/lib/en-paths";
import { usdify } from "@/lib/lang";
import PricingPlans from "@/components/PricingPlans";
import ProPlans from "@/components/ProPlans";
import { getLang } from "@/lib/lang-server";
import { siteCur } from "@/lib/viewer-cur";
import { addonPriceF, fmtCur, type Cur } from "@/lib/foreign-prices";

export async function generateMetadata(): Promise<Metadata> {
  const en = (await getLang()) === "en";
  return {
    title: en ? "Pricing – online galleries for photographers | Lenslie" : "Cennik galerii online dla fotografów – od 5 zł | Lenslie",
    description: en
      ? "Pay only for the galleries you deliver to clients. No subscription, all features included."
      : "Ile kosztuje galeria zdjęć online dla klienta? Płacisz tylko za galerie, które oddajesz klientom – od 5 zł, bez abonamentu, wszystkie funkcje w cenie.",
    alternates: langAlternates("/cennik", (en ? "en" : "pl")),
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
      ["Czy mogę dodać film do galerii?", "Tak. Wgrywasz oryginał w pełnej jakości (do 30 GB), a my przygotowujemy lekki podgląd do oglądania – film wyświetla się na samej górze galerii. Film jest w cenie galerii, bez dopłat – liczy się tylko do miejsca w pakiecie, razem ze zdjęciami."],
      ["Czy goście wesela mogą dodawać swoje zdjęcia?", "Tak – „Zdjęcia od gości” to 99 zł za wydarzenie. Goście skanują kod QR ze stołu i wrzucają zdjęcia i filmy z telefonów, bez aplikacji i logowania. Rok dodawania i oglądania, do 30 GB, kartki z kodem QR do druku w zestawie."],
      ["Czy muszę płacić abonament?", "Nie. Płacisz tylko za galerie, które publikujesz. Konto, panel i wersje robocze galerii są bezpłatne. Jeśli robisz dużo sesji, możesz wybrać abonament Pro – wtedy publikujesz galerie bez opłat w ramach miejsca, a wszystkie dodatki są w cenie."],
      ["Jak działa abonament Pro?", "Płacisz miesięcznie albo rocznie za miejsce na wszystkie galerie i filmy (500 GB, 700 GB, 1 TB albo 2 TB) – filmy są w cenie do 5, 8, 10 albo 20 godzin, a w pakietach dla filmowców do 30 albo 60 godzin. Galerie nie wygasają, dopóki trwa abonament. Abonament nie odnawia się sam – 7 dni przed końcem przypomnimy mailem, a po końcu galerie działają jeszcze 30 dni. Na większy pakiet przejdziesz w każdej chwili, dopłacając tylko różnicę za pozostałe dni."],
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
      ["Can I add a video to a gallery?", "Yes. You upload the full-quality original (up to 30 GB) and we prepare a light preview for watching – the video appears at the very top of the gallery. The video is included in the gallery price at no extra cost – it only counts towards the plan's storage, together with photos."],
      ["Can wedding guests add their own photos?", "Yes – “Guest uploads” costs PLN 99 per event. Guests scan a QR code on the table and upload photos and videos from their phones, no app or login. A year of uploads and viewing, up to 30 GB, printable QR table cards included."],
      ["Do I need a subscription?", "No. You only pay for the galleries you publish. Your account, dashboard and gallery drafts are free. If you shoot a lot, you can choose a Pro subscription – publish galleries at no extra cost within your storage, with all add-ons included."],
      ["How does the Pro subscription work?", "You pay monthly or yearly for storage for all your galleries and videos (500 GB, 700 GB, 1 TB or 2 TB) – videos are included up to 5, 8, 10 or 20 hours, and up to 30 or 60 hours in the filmmaker plans. Galleries don't expire while you're subscribed. It doesn't renew automatically – we'll email you 7 days before the end, and galleries keep working for 30 days after. You can upgrade anytime and only pay the difference for the remaining days."],
      ["How can I pay?", "By BLIK, bank transfer or card via Przelewy24 (in PLN) – per gallery or from your prepaid account balance (top up PLN 200 and get PLN 10 extra)."],
    ],
  },
};

// Odpowiedzi FAQ w wersji angielskiej z płatnościami kartą (waluta kraju odwiedzającego)
function cardQa(qa: string[][], cur: Cur): string[][] {
  const f = (eur: number) => fmtCur(eur, cur);
  return qa.map(([q, a]) => {
    if (q === "How can I pay?")
      return [q, `By card, Apple Pay or Google Pay, in ${cur === "eur" ? "euros" : cur === "usd" ? "US dollars" : "pounds"} – you pay for each gallery when you publish it. Your first gallery is free for up to 3 months.`];
    if (q === "Can wedding guests add their own photos?") return [q, a.replace(/PLN 99/, f(addonPriceF("guests", cur)))];
    return [q, a];
  });
}

export default async function Cennik() {
  const lang = await getLang();
  const cur = await siteCur(lang);
  const t = cur ? { ...TXT.en, lead: `${TXT.en.lead} Your first gallery is free.`, qa: cardQa(TXT.en.qa, cur) } : TXT[lang];
  return (
    <div className="pricing">
      <section className="pricing-head">
        <h1>{t.h1}</h1>
        <p>{t.lead}</p>
      </section>

      <PricingPlans cur={cur} />

      <ProPlans lang={lang} cur={cur} />

      {lang === "en" && cur && (
        <p className="hint-inline usd-note">Prices in {cur === "eur" ? "euros" : cur === "usd" ? "US dollars" : "British pounds"}. Secure card payments by Stripe.</p>
      )}
      {lang === "en" && !cur && (
        <p className="hint-inline usd-note">
          Prices are charged in Polish złoty (PLN) via Przelewy24. Dollar amounts are approximate – the final amount depends on your bank&apos;s exchange rate.
        </p>
      )}

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
            <p>{lang === "en" && !cur ? usdify(a) : a}</p>
          </details>
        ))}
      </section>
    </div>
  );
}
