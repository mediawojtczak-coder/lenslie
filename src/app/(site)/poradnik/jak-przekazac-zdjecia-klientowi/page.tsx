import Link from "next/link";
import { langAlternates } from "@/lib/en-paths";
import type { Metadata } from "next";
import { getLang } from "@/lib/lang-server";
import { ogImage } from "@/lib/og";
import { siteCur } from "@/lib/viewer-cur";
import { addonPriceF, galleryPriceF, fmtCur } from "@/lib/foreign-prices";
import { tr } from "@/lib/lang";

const SLUG = "jak-przekazac-zdjecia-klientowi";
const PUBLISHED = "2026-11-25";

export async function generateMetadata(): Promise<Metadata> {
  const en = (await getLang()) === "en";
  return {
    title: en ? "How to deliver photos to clients – a comparison | Lenslie" : "Jak przekazać zdjęcia klientowi – porównanie sposobów | Lenslie",
    description: en
      ? "WeTransfer, Google Drive or an online gallery? We compare the ways photographers deliver sessions: limits, link expiry, photo proofing and client experience."
      : "WeTransfer, Dysk Google czy galeria online? Porównujemy sposoby oddawania sesji: limity, wygasanie linków, wybór zdjęć przez klienta i wygodę na telefonie.",
    alternates: langAlternates(`/poradnik/${SLUG}`, (en ? "en" : "pl")),
    openGraph: { type: "article", siteName: "Lenslie", locale: en ? "en_GB" : "pl_PL", images: [ogImage(en ? "en" : "pl")] },
  };
}

export default async function JakPrzekazacZdjecia() {
  const lang = await getLang();
  const cur = await siteCur(lang);
  const t = (pl: string, en: string) => tr(lang, pl, en);

  const rows: [string, string, string, string][] = [
    [
      t("Ile kosztuje", "Cost"),
      t("Darmowy plan z limitem, wyższe w abonamencie", "Free plan with limits, more on a subscription"),
      t("Darmowe miejsce na koncie Google, więcej w abonamencie", "Free Google account storage, more on a subscription"),
      cur ? `In Lenslie from ${fmtCur(galleryPriceF("mala", 1, cur), cur)} per gallery, no subscription` : t("W Lenslie od 5 zł za galerię, bez abonamentu", "In Lenslie from PLN 5 per gallery, no subscription"),
    ],
    [
      t("Limit danych", "Data limit"),
      t("Darmowo: do 10 transferów lub 3 GB w ciągu 30 dni", "Free: up to 10 transfers or 3 GB per 30 days"),
      t("Wspólne miejsce z Gmailem i Zdjęciami Google", "Storage shared with Gmail and Google Photos"),
      t("Pakiet do 1,5 GB, 5 GB albo 15 GB na galerię", "A 1.5 GB, 5 GB or 15 GB package per gallery"),
    ],
    [
      t("Jak długo działa link", "How long the link works"),
      t("Krótko – link do darmowego transferu wygasa", "Briefly – a free transfer link expires"),
      t("Dopóki nie usuniesz plików", "Until you delete the files"),
      t("Tyle, ile wybierzesz: 1, 3, 6 albo 12 miesięcy", "As long as you choose: 1, 3, 6 or 12 months"),
    ],
    [
      t("Oglądanie na telefonie", "Viewing on a phone"),
      t("Najpierw trzeba pobrać pliki", "Files must be downloaded first"),
      t("Lista plików, podgląd po jednym", "A file list, preview one by one"),
      t("Galeria ze zdjęciami w dobrej jakości i pokazem slajdów", "A gallery with good-quality photos and a slideshow"),
    ],
    [
      t("Wybór zdjęć przez klienta", "Client photo proofing"),
      t("Brak", "None"),
      t("Tylko przez komentarze albo osobną listę", "Only via comments or a separate list"),
      t("Serduszka przy zdjęciach, limit wyboru, lista dla Ciebie", "Hearts on photos, a selection limit, a list for you"),
    ],
    [
      t("Twoja marka", "Your brand"),
      t("Strona WeTransfer", "WeTransfer's page"),
      t("Wygląd Dysku Google", "Google Drive's look"),
      t("Twoje logo, motyw galerii, opcjonalnie własna domena", "Your logo, gallery theme, optionally your own domain"),
    ],
  ];

  const qa: [string, string][] = [
    [
      t("Jaki jest najlepszy sposób, żeby przekazać zdjęcia klientowi?", "What's the best way to deliver photos to a client?"),
      t(
        "Przy kilku plikach wystarczy WeTransfer albo Dysk Google. Przy całej sesji – zwłaszcza ślubnej czy rodzinnej – najwygodniejsza jest galeria online: klient ogląda zdjęcia na telefonie, zaznacza ulubione i pobiera całość jednym kliknięciem, a Ty nie musisz pilnować wygasających linków.",
        "For a few files, WeTransfer or Google Drive is enough. For a whole session – especially a wedding or family shoot – an online gallery is the most convenient: the client views photos on a phone, marks favourites and downloads everything in one click, and you don't have to chase expiring links.",
      ),
    ],
    [
      t("Czy klient musi zakładać konto, żeby pobrać zdjęcia?", "Does the client need an account to download photos?"),
      t(
        "W WeTransferze i w galerii Lenslie – nie. Klient dostaje link (w Lenslie także hasło) i pobiera zdjęcia z przeglądarki. Na Dysku Google zależy to od ustawień udostępniania folderu.",
        "With WeTransfer and a Lenslie gallery – no. The client gets a link (in Lenslie also a password) and downloads in the browser. With Google Drive it depends on the folder's sharing settings.",
      ),
    ],
    [
      t("Jak długo klient powinien mieć dostęp do zdjęć?", "How long should a client have access to the photos?"),
      t(
        "Tyle, ile potrzebuje na spokojne pobranie i pokazanie zdjęć rodzinie – zwykle od 1 do 12 miesięcy. Warto przypomnieć klientowi o pobraniu przed końcem dostępu. Lenslie może wysłać takie przypomnienie automatycznie tydzień przed końcem.",
        "Long enough to download calmly and share with family – usually 1 to 12 months. It's worth reminding the client to download before access ends. Lenslie can send that reminder automatically a week before.",
      ),
    ],
    [
      t("Czy galeria online zmniejsza jakość zdjęć?", "Does an online gallery reduce photo quality?"),
      t(
        "W Lenslie nie. Do oglądania pokazujemy lżejszą wersję, a do pobrania jest oryginał w pełnej rozdzielczości, bez kompresji – oraz osobna wersja do internetu.",
        "Not in Lenslie. A lighter version is shown for viewing, and the full-resolution original is available to download, uncompressed – plus a separate web version.",
      ),
    ],
  ];

  const title = t("Jak przekazać zdjęcia klientowi – porównanie sposobów", "How to deliver photos to clients – a comparison");
  const url = `https://www.lenslie.com/poradnik/${SLUG}`;
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: title,
      datePublished: PUBLISHED,
      dateModified: PUBLISHED,
      inLanguage: lang === "en" ? "en" : "pl",
      mainEntityOfPage: url,
      author: { "@type": "Organization", name: "Lenslie", url: "https://www.lenslie.com/" },
      publisher: { "@type": "Organization", name: "Lenslie", logo: { "@type": "ImageObject", url: "https://www.lenslie.com/icon-192.png" } },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Lenslie", item: "https://www.lenslie.com/" },
        { "@type": "ListItem", position: 2, name: t("Poradnik", "Guide"), item: "https://www.lenslie.com/poradnik" },
        { "@type": "ListItem", position: 3, name: title, item: url },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: qa.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
    },
  ];

  return (
    <article className="legal guide">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <nav className="guide-crumbs" aria-label={t("Ścieżka", "Breadcrumb")}>
        <Link href="/poradnik">{t("Poradnik", "Guide")}</Link>
      </nav>
      <h1>{title}</h1>
      <p className="legal-meta">
        {t("Opublikowano 25 listopada 2026", "Published 25 November 2026")} · Lenslie
      </p>

      <p>
        {t(
          "Sesja zrobiona, zdjęcia obrobione – zostaje ostatni krok, który klient zapamięta najbardziej: moment, w którym dostaje zdjęcia. Fotografowie najczęściej wysyłają je przez WeTransfer, udostępniają folder na Dysku Google albo zakładają klientowi galerię online. Każdy z tych sposobów działa, ale sprawdza się w innych sytuacjach. Poniżej porównujemy je z perspektywy fotografa i klienta.",
          "The shoot is done and the photos are edited – what's left is the step your client remembers most: the moment they receive the photos. Photographers most often send them via WeTransfer, share a Google Drive folder or set up an online gallery. Each works, but in different situations. Below we compare them from the photographer's and the client's point of view.",
        )}
      </p>

      <h2>{t("Szybkie porównanie", "Quick comparison")}</h2>
      <div className="alt-table guide-table" role="table">
        <div className="alt-row alt-headrow" role="row">
          <span role="columnheader" />
          <b role="columnheader">WeTransfer</b>
          <b role="columnheader">{t("Dysk Google", "Google Drive")}</b>
          <b role="columnheader">{t("Galeria online", "Online gallery")}</b>
        </div>
        {rows.map(([k, a, b, c]) => (
          <div className="alt-row" role="row" key={k}>
            <span role="rowheader">{k}</span>
            <span role="cell">{a}</span>
            <span role="cell">{b}</span>
            <span role="cell" className="alt-us">{c}</span>
          </div>
        ))}
      </div>
      <p className="alt-note">
        {t(
          "Limity WeTransfer według strony pomocy WeTransfer (aktualizacja z 23.10.2026). Informacje o Dysku Google według stanu z listopada 2026. Usługi mogą zmieniać plany i ceny.",
          "WeTransfer limits according to WeTransfer's help centre (updated 23 Oct 2026). Google Drive details as of November 2026. Services may change their plans and prices.",
        )}
      </p>

      <h2>{t("WeTransfer – szybko, ale na chwilę", "WeTransfer – quick, but temporary")}</h2>
      <p>
        {t(
          "WeTransfer to najprostszy sposób, żeby wysłać komuś duże pliki: wybierasz zdjęcia, wpisujesz adres i gotowe. Problem zaczyna się przy regularnej pracy. Według strony pomocy WeTransfer darmowe konto pozwala wysłać do 10 transferów albo łącznie 3 GB w ciągu 30 dni – a to mniej niż jedna pełna sesja ślubna w wysokiej rozdzielczości. Link do transferu wygasa, więc klient, który nie zdążył pobrać zdjęć, prosi o ponowne wysłanie.",
          "WeTransfer is the simplest way to send someone large files: pick the photos, enter the address, done. Problems start with regular work. According to WeTransfer's help centre, a free account allows up to 10 transfers or 3 GB in total within 30 days – less than one full high-resolution wedding. Transfer links expire, so a client who didn't download in time asks you to send them again.",
        )}
      </p>
      <p>
        {t(
          "Klient dostaje paczkę plików, a nie zdjęcia do obejrzenia: żeby zobaczyć sesję, musi ją najpierw pobrać i rozpakować – na telefonie bywa to kłopotliwe. Nie ma też możliwości zaznaczenia ulubionych zdjęć.",
          "The client gets a bundle of files rather than photos to look at: to see the session they must first download and unzip it – often awkward on a phone. There's also no way to mark favourites.",
        )}
      </p>
      <p>{t("Dobre do: wysłania kilku plików, szybkiej poprawki, przekazania materiałów innemu fotografowi.", "Good for: sending a few files, a quick fix, handing material to another photographer.")}</p>

      <h2>{t("Dysk Google – wygodny dla Ciebie, mniej dla klienta", "Google Drive – convenient for you, less so for the client")}</h2>
      <p>
        {t(
          "Folder na Dysku Google nie wygasa i łatwo go udostępnić linkiem. Miejsce jest jednak wspólne z Gmailem i Zdjęciami Google – darmowe konto ma do 15 GB, a w 2026 roku Google zaczął przy nowych kontach dawać pełne 15 GB dopiero po podaniu numeru telefonu. Kilka sesji ślubnych i miejsce się kończy, więc szybko pojawia się abonament albo ręczne sprzątanie starych folderów.",
          "A Google Drive folder doesn't expire and is easy to share with a link. But the storage is shared with Gmail and Google Photos – a free account has up to 15 GB, and in 2026 Google started giving new accounts the full 15 GB only after adding a phone number. A few weddings and the space runs out, so you end up paying for a subscription or cleaning up old folders by hand.",
        )}
      </p>
      <p>
        {t(
          "Dla klienta to lista plików o nazwach w stylu IMG_4821.jpg. Da się je przeglądać, ale nie wygląda to jak oddanie pracy fotografa – i łatwo o pomyłkę w ustawieniach udostępniania (folder otwarty dla każdego z linkiem albo przeciwnie: klient widzi „Brak dostępu”).",
          "To the client it's a list of files named like IMG_4821.jpg. They can browse them, but it doesn't feel like a photographer's delivery – and it's easy to get the sharing settings wrong (open to anyone with the link, or the opposite: the client sees “Access denied”).",
        )}
      </p>
      <p>{t("Dobre do: współpracy z drugim fotografem lub retuszerem, własnej kopii zapasowej.", "Good for: working with a second shooter or retoucher, your own backup.")}</p>

      <h2>{t("Galeria online – oddanie sesji, które wygląda profesjonalnie", "An online gallery – a delivery that looks professional")}</h2>
      <p>
        {t(
          "Galeria online dla klienta to strona ze zdjęciami z sesji, zabezpieczona linkiem i hasłem. Klient otwiera ją na telefonie albo komputerze, ogląda zdjęcia od razu (bez pobierania), może puścić pokaz slajdów rodzinie i pobrać całą sesję jako ZIP – w pełnej rozdzielczości albo w wersji do internetu.",
          "A client online gallery is a page with the session's photos, protected by a link and password. The client opens it on a phone or computer, views the photos straight away (no download), can play a slideshow for the family and download the whole session as a ZIP – in full resolution or a web version.",
        )}
      </p>
      <p>
        {t(
          "Dla fotografa największa różnica to wybór zdjęć. Klient zaznacza serduszkiem ulubione zdjęcia – do obróbki, do albumu albo do odbitek – a Ty dostajesz gotową listę, zamiast przepisywać numery plików z maila. Galeria ma Twoje logo, więc to Twoja marka, a nie marka serwisu, zostaje w pamięci klienta.",
          "For the photographer the biggest difference is proofing. The client marks favourites with a heart – for editing, an album or prints – and you get a ready list instead of copying file numbers from an e-mail. The gallery carries your logo, so it's your brand, not the service's, that the client remembers.",
        )}
      </p>
      <p>{t("Tak wygląda to w Lenslie:", "This is how it works in Lenslie:")}</p>
      <ul>
        <li>{t("prywatny link i hasło, kod QR i gotowa wiadomość dla klienta,", "a private link and password, a QR code and a ready message for the client,")}</li>
        <li>{t("ulubione zdjęcia klienta z limitem wyboru, sekcje i pokaz slajdów,", "client favourites with a selection limit, sections and a slideshow,")}</li>
        <li>
          {t("pobieranie całej sesji jako ZIP, bez kompresji oryginałów,", "the whole session as a ZIP, originals uncompressed,")}
        </li>
        <li>
          {t("automatyczne ", "an automatic ")}
          <Link href="/przypomnienie">{t("przypomnienie dla klienta", "reminder for the client")}</Link>
          {t(" tydzień przed końcem dostępu,", " a week before access ends,")}
        </li>
        <li>
          {t("eksport prosto z Lightrooma (", "export straight from Lightroom (")}
          <Link href="/funkcje/wtyczka-lightroom">{t("wtyczka Lightroom", "Lightroom plug-in")}</Link>
          {t(") i ", ") and ")}
          <Link href="/funkcje/sprzedaz-zdjec">{t("sprzedaż dodatkowych zdjęć", "selling extra photos")}</Link>
          {t(",", ",")}
        </li>
        <li>{t("zdjęcia przechowywane na serwerach w Unii Europejskiej.", "photos stored on servers in the European Union.")}</li>
      </ul>
      <p>
        {t(
          "Płacisz za galerię, którą oddajesz klientowi – od 5 zł za mniejszą sesję na miesiąc do 25 zł za reportaż ślubny na rok. Szczegóły są w ",
          cur
            ? `You pay per gallery you deliver – from ${fmtCur(galleryPriceF("mala", 1, cur), cur)} for a smaller session for a month to ${fmtCur(galleryPriceF("duza", 12, cur), cur)} for a wedding for a year. Details are in the `
            : "You pay per gallery you deliver – from PLN 5 for a smaller session for a month to PLN 25 for a wedding for a year. Details are in the ",
        )}
        <Link href="/cennik">{t("cenniku", "pricing")}</Link>.
        {t(" Jeśli korzystasz z Pixieset, zobacz też ", " If you use Pixieset, see also ")}
        <Link href="/alternatywa-pixieset">{t("porównanie Lenslie z Pixieset", "Lenslie vs Pixieset")}</Link>.
      </p>

      <h2>{t("A pendrive albo płyta?", "What about a USB stick or a disc?")}</h2>
      <p>
        {t(
          "Pendrive w ładnym pudełku wciąż bywa miłym dodatkiem do pakietu ślubnego, ale jako jedyny sposób oddania zdjęć się nie sprawdza: trzeba go wysłać albo spotkać się z klientem, a rodzina i znajomi pary i tak poproszą o link. Najczęściej pendrive jest uzupełnieniem galerii online, a nie zamiennikiem.",
          "A USB stick in a nice box can still be a lovely extra in a wedding package, but as the only delivery method it falls short: you have to post it or meet the client, and family and friends will ask for a link anyway. Most often it complements an online gallery rather than replacing it.",
        )}
      </p>

      <h2>{t("Co wybrać?", "What to choose?")}</h2>
      <p>
        {t(
          "Jeśli wysyłasz kilka plików raz na jakiś czas – WeTransfer w zupełności wystarczy. Jeśli oddajesz całe sesje i chcesz, żeby klient mógł wygodnie obejrzeć zdjęcia, wybrać ulubione i pobrać je w pełnej jakości bez Twojej pomocy – postaw na galerię online. Oszczędzasz czas na odpowiadaniu na maile w stylu „link już nie działa”, a klient dostaje zdjęcia w formie, którą chętnie pokaże dalej.",
          "If you send a few files now and then, WeTransfer is plenty. If you deliver whole sessions and want the client to comfortably view the photos, pick favourites and download in full quality without your help – go for an online gallery. You save time on “the link doesn't work any more” e-mails, and the client gets photos in a form they'll happily share.",
        )}
      </p>

      <h2>{t("Najczęstsze pytania", "Frequently asked questions")}</h2>
      <div className="alt-faq guide-faq">
        {qa.map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </div>

      <section className="fs-cta">
        <h2>{t("Oddaj następną sesję w galerii Lenslie", "Deliver your next session in a Lenslie gallery")}</h2>
        <p>{t("Konto i panel są bezpłatne. Płacisz dopiero, gdy publikujesz galerię dla klienta.", "Your account and dashboard are free. You only pay when you publish a gallery.")}</p>
        <div className="fs-ctas center">
          <Link href="/rejestracja" className="btn btn-dark">
            {t("Załóż darmowe konto", "Create a free account")}
          </Link>
          <Link href="/cennik" className="fs-link">
            {t("Zobacz cennik", "See pricing")}
          </Link>
        </div>
      </section>
    </article>
  );
}
