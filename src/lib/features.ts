// Strony reklamowe funkcji Lenslie (/funkcje/<adres>) i karty na stronie głównej.
// Teksty po polsku i angielsku: [pl, en].

export type L = [string, string];
export type FeatureVisual = "album" | "print" | "lightroom" | "qr" | "sale" | "portfolio" | "booking" | "video" | "themes" | "domain" | "faces" | "app";

export type Feature = {
  slug: string;
  href?: string; // własna strona (np. /znajdz-siebie)
  visual: FeatureVisual;
  card: { title: L; text: L; price: L };
  kicker: L;
  title: L;
  lead: L;
  price: L;
  steps: { title: L; text: L }[];
  forPhotographer: L[];
  forClient: { title: L; items: L[] };
  band: { title: L; points: { title: L; text: L }[] };
  cta: { title: L; text: L };
};

export const FEATURES: Feature[] = [
  {
    slug: "projektor-albumow",
    visual: "album",
    card: {
      title: ["Projektor albumów", "Album designer"],
      text: ["Klient zaznacza zdjęcia, a album projektuje się sam – gotowe rozkładówki do drukarni.", "Your client picks photos and the album designs itself – print-ready spreads."],
      price: ["39 zł / mies. · pierwszy album gratis", "PLN 39 / mo · first album free"],
    },
    kicker: ["Projektor albumów", "Album designer"],
    title: ["Album projektuje się sam. Ty tylko go podpisujesz.", "The album designs itself. You just sign it off."],
    lead: [
      "Klient zaznacza w galerii zdjęcia do albumu, a Lenslie w kilka sekund układa z nich eleganckie rozkładówki – z oddechem, panoramami i zdjęciami jak odbitki na rozmytym tle. Poprawiasz kilka rzeczy i pobierasz pliki do drukarni.",
      "Your client marks album photos in the gallery and Lenslie lays them out into elegant spreads in seconds – with white space, panoramas and print-like photos on a blurred background. Tweak a few things and download print files.",
    ],
    price: ["39 zł miesięcznie albo 290 zł rocznie · bez limitu albumów · pierwszy album gratis", "PLN 39 per month or PLN 290 per year · unlimited albums · first album free"],
    steps: [
      { title: ["Klient wybiera", "Client picks"], text: ["Zaznacza serduszkiem zdjęcia do albumu – limit wyboru ustawiasz w galerii.", "Marks album photos with a heart – you set the selection limit in the gallery."] },
      { title: ["Lenslie projektuje", "Lenslie designs"], text: ["Format, styl, tło i liczba stron (20–60) – projekt gotowy w kilka sekund.", "Size, style, background and page count (20–60) – the design is ready in seconds."] },
      { title: ["Ty pobierasz", "You download"], text: ["Rozkładówki JPEG 300 dpi ze spadem, z oryginałów – prosto do drukarni.", "300 dpi JPEG spreads with bleed, from originals – straight to the lab."] },
    ],
    forPhotographer: [
      ["Godziny pracy w Photoshopie zamieniasz na kilka minut poprawek.", "Hours in Photoshop become minutes of tweaks."],
      ["Edytor swobodny: przesuwasz zdjęcia, zmieniasz rozmiar ramek, kadr i powiększenie.", "Free editor: move photos, resize frames, adjust crop and zoom."],
      ["Formaty kwadratowe, poziome i pionowe – takie, jakie przyjmują popularne drukarnie.", "Square, landscape and portrait sizes – the ones popular labs accept."],
      ["Style Atelier, Magazyn, Minimal i Klasyczny – zawsze spójnie i elegancko.", "Atelier, Editorial, Minimal and Classic styles – always consistent and elegant."],
    ],
    forClient: {
      title: ["Dla pary", "For the couple"],
      items: [
        ["Wybór zdjęć w galerii jednym kliknięciem, na telefonie i komputerze.", "Picking photos in the gallery with one tap, on phone and desktop."],
        ["Album, który wygląda jak z pracowni projektowej.", "An album that looks designer-made."],
      ],
    },
    band: {
      title: ["Luksus w każdym detalu", "Luxury in every detail"],
      points: [
        { title: ["Rozmyte tło ze zdjęcia", "Blurred photo background"], text: ["Kolory rozkładówki zawsze do siebie pasują.", "Spread colours always match."] },
        { title: ["Zdjęcia jak odbitki", "Print-like photos"], text: ["Biała ramka i miękki cień, nachodzące kadry.", "White border, soft shadow, overlapping frames."] },
        { title: ["Strona tytułowa", "Title page"], text: ["Monogram pary, imiona i data.", "The couple's monogram, names and date."] },
      ],
    },
    cta: { title: ["Zaprojektuj pierwszy album za darmo", "Design your first album for free"], text: ["Projektowanie i podgląd są bezpłatne, a pierwszy album pobierzesz gratis.", "Designing and previewing are free, and your first album download is on us."] },
  },
  {
    slug: "druk-albumow",
    visual: "print",
    card: {
      title: ["Druk albumów", "Album printing"],
      text: ["Zamów gotowy album w twardej oprawie prosto z projektu – z dostawą do paczkomatu.", "Order the finished hardcover album straight from the design – delivered to a parcel locker."],
      price: ["od 190 zł · InPost 15 zł", "from PLN 190 · InPost PLN 15"],
    },
    kicker: ["Druk albumów", "Album printing"],
    title: ["Wspomnienia, które żyją", "Memories that live on"],
    lead: [
      "Projekt z Lenslie zamówisz wydrukowany jednym kliknięciem. Pliki przygotujemy z oryginałów zdjęć, a gotowy album przyjedzie InPostem do wybranego paczkomatu – do Ciebie albo prosto do pary.",
      "Order your Lenslie design printed in one click. We prepare the files from the original photos and the finished album arrives by InPost to the locker you choose – yours or the couple's.",
    ],
    price: ["15×15 cm 190 zł · 20×20 cm 220 zł · 25×25 cm 280 zł (20 stron) · każda kolejna strona 12 zł · wysyłka 15 zł", "15×15 cm PLN 190 · 20×20 cm PLN 220 · 25×25 cm PLN 280 (20 pages) · each extra page PLN 12 · delivery PLN 15"],
    steps: [
      { title: ["Projektujesz", "You design"], text: ["Album w Projektorze albumów – format 15×15, 20×20 albo 25×25 cm.", "The album in the Album designer – 15×15, 20×20 or 25×25 cm."] },
      { title: ["Zamawiasz", "You order"], text: ["Liczba egzemplarzy, kod paczkomatu i płatność BLIK-iem, kartą lub z salda.", "Number of copies, locker code and payment by card, BLIK or balance."] },
      { title: ["Odbierasz", "You collect"], text: ["Czas realizacji do 12 dni roboczych. Numer przesyłki dostaniesz mailem.", "Lead time up to 12 working days. You'll get the tracking number by e-mail."] },
    ],
    forPhotographer: [
      ["Bez eksportów, wgrywania plików do drukarni i pilnowania spadów.", "No exporting, uploading to the lab or checking bleed."],
      ["Sprzedajesz parze album jako część pakietu – i zarabiasz na nim.", "Sell the album as part of your package – and earn on it."],
      ["Od 20 do 40 stron, kilka egzemplarzy, np. dla rodziców.", "20 to 40 pages, several copies, e.g. for the parents."],
    ],
    forClient: {
      title: ["Dla pary", "For the couple"],
      items: [
        ["Pamiątka, którą bierze się do ręki – nie tylko pliki na dysku.", "A keepsake to hold – not just files on a drive."],
        ["Dostawa do paczkomatu, odbiór kiedy wygodnie.", "Delivery to a parcel locker, pick it up when it suits you."],
      ],
    },
    band: {
      title: ["Prosto i bez niespodzianek", "Simple, no surprises"],
      points: [
        { title: ["Jasna cena", "Clear pricing"], text: ["Widzisz koszt albumu i wysyłki przed zapłatą.", "See the album and delivery cost before you pay."] },
        { title: ["Druk z oryginałów", "Printed from originals"], text: ["300 dpi, sRGB, spad 3 mm.", "300 dpi, sRGB, 3 mm bleed."] },
        { title: ["Wysyłka InPost", "InPost delivery"], text: ["Kod odbioru przychodzi SMS-em.", "The pickup code arrives by text."] },
      ],
    },
    cta: { title: ["Zamień galerię w album", "Turn the gallery into an album"], text: ["Zaprojektuj album w Lenslie i zamów go wydrukowanego.", "Design the album in Lenslie and order it printed."] },
  },
  {
    slug: "wtyczka-lightroom",
    visual: "lightroom",
    card: {
      title: ["Wtyczka Lightroom", "Lightroom plug-in"],
      text: ["Publikujesz galerie prosto z Lightroom Classic – bez eksportu i wgrywania.", "Publish galleries straight from Lightroom Classic – no exporting or uploading."],
      price: ["za darmo", "free"],
    },
    kicker: ["Lightroom Classic", "Lightroom Classic"],
    title: ["Z Lightrooma do galerii jednym kliknięciem", "From Lightroom to the gallery in one click"],
    lead: [
      "Kolekcja w Lightroomie to galeria w Lenslie. Przeciągasz zdjęcia, klikasz „Publikuj” – i gotowe. Poprawiłeś zdjęcie? Jedno kliknięcie podmienia je u klienta.",
      "A Lightroom collection is a Lenslie gallery. Drag photos in, click “Publish” – done. Edited a photo? One click replaces it for your client.",
    ],
    price: ["Bezpłatna dla wszystkich kont · Lightroom Classic na Mac i Windows", "Free for all accounts · Lightroom Classic on Mac and Windows"],
    steps: [
      { title: ["Instalujesz", "Install"], text: ["Pobierasz wtyczkę z panelu i dodajesz ją w Menedżerze modułów.", "Download the plug-in from your dashboard and add it in the Plug-in Manager."] },
      { title: ["Logujesz się", "Sign in"], text: ["E-mailem i hasłem do Lenslie – raz na komputer.", "With your Lenslie e-mail and password – once per computer."] },
      { title: ["Publikujesz", "Publish"], text: ["Oryginał i lżejsza wersja do oglądania trafiają do galerii automatycznie.", "The original and a lighter viewing version go to the gallery automatically."] },
    ],
    forPhotographer: [
      ["Koniec z eksportem na dysk i wgrywaniem przez przeglądarkę.", "No more exporting to disk and uploading in the browser."],
      ["Poprawki trafiają do „Zmodyfikowanych” – jedno kliknięcie i klient widzi nową wersję.", "Edits move to “Modified” – one click and your client sees the new version."],
      ["Usunięcie zdjęcia z kolekcji usuwa je z galerii, zmiana nazwy zmienia nazwę galerii.", "Removing a photo from the collection removes it from the gallery; renaming renames the gallery."],
      ["Znak wodny nakłada się automatycznie po publikacji.", "The watermark is applied automatically after publishing."],
    ],
    forClient: {
      title: ["Dla klienta", "For your client"],
      items: [
        ["Szybciej dostaje zdjęcia – bez czekania na eksport.", "Gets photos faster – no waiting for exports."],
        ["Zawsze ogląda najnowsze wersje po Twoich poprawkach.", "Always sees the latest versions after your edits."],
      ],
    },
    band: {
      title: ["Pracujesz tam, gdzie zawsze", "Work where you always do"],
      points: [
        { title: ["Usługa publikowania", "Publish service"], text: ["Lenslie w panelu Lightrooma, obok dysku i Flickra.", "Lenslie in Lightroom's panel, next to Hard Drive and Flickr."] },
        { title: ["Pełna jakość", "Full quality"], text: ["Oryginały w jakości z okna eksportu.", "Originals at your export quality."] },
        { title: ["Bezpiecznie", "Secure"], text: ["Wylogujesz wtyczkę ze wszystkich komputerów w panelu.", "Sign the plug-in out of all computers from your dashboard."] },
      ],
    },
    cta: { title: ["Oszczędzaj godziny przy każdym zleceniu", "Save hours on every job"], text: ["Wtyczka jest bezpłatna dla wszystkich kont Lenslie.", "The plug-in is free for every Lenslie account."] },
  },
  {
    slug: "aplikacja-na-komputer",
    visual: "app",
    card: {
      title: ["Aplikacja na komputer", "Desktop app"],
      text: ["Lenslie w osobnym oknie z ikoną w Docku i menu Start – na Macu, Windowsie, telefonie i tablecie.", "Lenslie in its own window with an icon in your Dock or Start menu – on Mac, Windows, phone and tablet."],
      price: ["Bezpłatnie", "Free"],
    },
    kicker: ["Aplikacja na komputer", "Desktop app"],
    title: ["Twoje galerie zawsze pod ręką – jednym kliknięciem z Docka", "Your galleries always at hand – one click from your Dock"],
    lead: [
      "Zainstaluj Lenslie jak zwykły program: własne okno, ikona w Docku albo menu Start, bez paska adresu i kart przeglądarki. Bez pobierania instalatora i bez aktualizowania – zawsze masz najnowszą wersję.",
      "Install Lenslie like a regular app: its own window, an icon in your Dock or Start menu, no address bar or browser tabs. No installer to download and nothing to update – you always have the latest version.",
    ],
    price: ["Bezpłatnie dla każdego konta · Mac, Windows, iPhone, iPad i Android", "Free for every account · Mac, Windows, iPhone, iPad and Android"],
    steps: [
      { title: ["Otwierasz panel", "Open your dashboard"], text: ["Zaloguj się do Lenslie w Chrome, Edge albo Safari.", "Sign in to Lenslie in Chrome, Edge or Safari."] },
      { title: ["Klikasz „Aplikacja na komputer”", "Click “Desktop app”"], text: ["Przycisk jest w menu panelu – w Chrome wystarczy potwierdzić „Zainstaluj”.", "The button is in the dashboard menu – in Chrome just confirm “Install”."] },
      { title: ["Gotowe", "Done"], text: ["Ikona Lenslie pojawia się w Docku, menu Start albo na ekranie telefonu.", "The Lenslie icon appears in your Dock, Start menu or on your phone's home screen."] },
    ],
    forPhotographer: [
      ["Panel otwierasz jednym kliknięciem, bez szukania karty w przeglądarce.", "Open your dashboard in one click, without hunting for a browser tab."],
      ["Osobne okno – galerie nie giną między dziesiątkami kart.", "A separate window – galleries don't get lost among dozens of tabs."],
      ["Zawsze najnowsza wersja – nic nie pobierasz i nie aktualizujesz.", "Always the latest version – nothing to download or update."],
      ["Ta sama aplikacja na komputerze, telefonie i tablecie.", "The same app on your computer, phone and tablet."],
    ],
    forClient: {
      title: ["Dla klienta", "For your client"],
      items: [["Galerie klientów działają jak dotąd – w przeglądarce, bez instalowania czegokolwiek.", "Client galleries work just as before – in the browser, nothing to install."]],
    },
    band: {
      title: ["Lekka i bezpieczna", "Light and safe"],
      points: [
        { title: ["Nic do pobrania", "Nothing to download"], text: ["Instalacja w kilka sekund prosto z przeglądarki.", "Installs in seconds straight from your browser."] },
        { title: ["Zawsze aktualna", "Always up to date"], text: ["Nowe funkcje widzisz od razu, bez aktualizacji.", "New features show up instantly, no updates."] },
        { title: ["Na każdym sprzęcie", "On every device"], text: ["Mac, Windows, iPhone, iPad i Android.", "Mac, Windows, iPhone, iPad and Android."] },
      ],
    },
    cta: { title: ["Miej Lenslie w Docku", "Keep Lenslie in your Dock"], text: ["Załóż konto i zainstaluj aplikację – za darmo.", "Create an account and install the app – for free."] },
  },
  {
    slug: "zdjecia-od-gosci",
    visual: "qr",
    card: {
      title: ["Zdjęcia od gości (kody QR)", "Guest uploads (QR codes)"],
      text: ["Eleganckie kartki z kodem QR na stoły – goście wrzucają zdjęcia i filmy z wesela.", "Elegant QR table cards – guests upload their wedding photos and videos."],
      price: ["99 zł za wesele", "PLN 99 per wedding"],
    },
    kicker: ["Zdjęcia od gości", "Guest uploads"],
    title: ["Setki zdjęć z wesela, których nie zrobi żaden fotograf", "Hundreds of wedding photos no photographer could take"],
    lead: [
      "Na każdym stole kartka z kodem QR. Goście skanują go telefonem i wrzucają swoje zdjęcia i filmy prosto do jednej galerii pary – bez aplikacji i bez logowania.",
      "A QR card on every table. Guests scan it and upload their photos and videos into one gallery for the couple – no app, no login.",
    ],
    price: ["99 zł jednorazowo za wesele · rok dodawania i oglądania · do 30 GB", "PLN 99 one-off per wedding · a year of uploads and viewing · up to 30 GB"],
    steps: [
      { title: ["Tworzysz wydarzenie", "Create the event"], text: ["Imiona pary, data, powitanie i okładka – dwie minuty.", "Couple's names, date, welcome and cover – two minutes."] },
      { title: ["Drukujesz kartki", "Print the cards"], text: ["Gotowe karty ze złotą ramką i kodem QR, 4 na stronie A4.", "Ready cards with a gold frame and QR code, 4 per A4 page."] },
      { title: ["Goście dodają", "Guests add"], text: ["Zdjęcia i filmy z telefonów trafiają od razu do galerii.", "Photos and videos from phones go straight into the gallery."] },
    ],
    forPhotographer: [
      ["Dodatek, który sprzedasz parze np. za 199–299 zł.", "An add-on you can sell to the couple, e.g. for PLN 199–299."],
      ["Moderacja – usuwasz niechciane zdjęcia jednym kliknięciem.", "Moderation – remove unwanted photos in one click."],
      ["Pobieranie wszystkiego naraz w ZIP.", "Download everything at once as a ZIP."],
    ],
    forClient: {
      title: ["Dla pary i gości", "For the couple and guests"],
      items: [
        ["Wesele oczami gości – w jednym miejscu, nie w dziesięciu grupach na komunikatorach.", "The wedding through the guests' eyes – in one place, not ten group chats."],
        ["Polski i angielski dla gości z zagranicy.", "Polish and English for guests from abroad."],
      ],
    },
    band: {
      title: ["Wygląda drogo, działa prosto", "Looks expensive, works simply"],
      points: [
        { title: ["Ślubna strona", "Wedding page"], text: ["Imiona, data i okładka w eleganckim stylu.", "Names, date and cover in an elegant style."] },
        { title: ["Zdjęcia i filmy", "Photos and videos"], text: ["W oryginalnej jakości, prosto z telefonu.", "In original quality, straight from the phone."] },
        { title: ["Bez aplikacji", "No app"], text: ["Wystarczy aparat w telefonie.", "Just the phone's camera."] },
      ],
    },
    cta: { title: ["Dodaj kody QR do swojej oferty", "Add QR codes to your offer"], text: ["99 zł za wesele – bez abonamentu.", "PLN 99 per wedding – no subscription."] },
  },
  {
    slug: "sprzedaz-zdjec",
    visual: "sale",
    card: {
      title: ["Sprzedaż zdjęć", "Photo sales"],
      text: ["Pakiet zdjęć w cenie sesji, a za każde dodatkowe klient dopłaca Tobie.", "Photos included with the session – your client pays you for every extra one."],
      price: ["bez prowizji", "no commission"],
    },
    kicker: ["Sprzedaż zdjęć", "Photo sales"],
    title: ["Zarabiaj na każdym dodatkowym zdjęciu", "Earn on every extra photo"],
    lead: [
      "Ustalasz, ile zdjęć jest w pakiecie i ile kosztuje każde kolejne. Klient wybiera ulubione w galerii, widzi kwotę i płaci Tobie przelewem lub BLIK-iem. Po wpłacie jednym kliknięciem udostępniasz zdjęcia bez znaku wodnego.",
      "Set how many photos are included and the price of each extra one. Your client picks favourites in the gallery, sees the total and pays you by transfer or BLIK. Once paid, one click releases the photos without a watermark.",
    ],
    price: ["W cenie galerii · pieniądze trafiają prosto do Ciebie, bez prowizji Lenslie", "Included with the gallery · money goes straight to you, no Lenslie commission"],
    steps: [
      { title: ["Ustawiasz pakiet", "Set the package"], text: ["Np. 30 zdjęć w cenie sesji i 20 zł za każde kolejne.", "E.g. 30 photos included and PLN 20 for each extra one."] },
      { title: ["Klient wybiera", "Client picks"], text: ["Zaznacza ulubione – galeria od razu liczy dopłatę.", "Marks favourites – the gallery calculates the extra cost right away."] },
      { title: ["Dostarczasz", "You deliver"], text: ["Po wpłacie udostępniasz zdjęcia w pełnej jakości.", "Once paid, you release the photos in full quality."] },
    ],
    forPhotographer: [
      ["Dodatkowy zarobek bez negocjacji i liczenia w arkuszach.", "Extra income without haggling or spreadsheets."],
      ["Znak wodny chroni zdjęcia do czasu zapłaty.", "The watermark protects photos until payment."],
      ["Wszystkie zamówienia w jednym miejscu w panelu.", "All orders in one place in your dashboard."],
    ],
    forClient: {
      title: ["Dla klienta", "For your client"],
      items: [
        ["Jasna cena przed zamówieniem.", "A clear price before ordering."],
        ["Wybór zdjęć w kilka minut na telefonie.", "Picking photos in minutes on the phone."],
      ],
    },
    band: {
      title: ["Proste zasady", "Simple rules"],
      points: [
        { title: ["Twoja cena", "Your price"], text: ["Ty ustalasz pakiet i cenę zdjęcia.", "You set the package and the photo price."] },
        { title: ["Twoje konto", "Your account"], text: ["Klient płaci bezpośrednio Tobie.", "Your client pays you directly."] },
        { title: ["Zero prowizji", "Zero commission"], text: ["Lenslie nie bierze nic od sprzedaży.", "Lenslie takes nothing from sales."] },
      ],
    },
    cta: { title: ["Sprzedawaj więcej zdjęć", "Sell more photos"], text: ["Włącz sprzedaż w ustawieniach dowolnej galerii.", "Turn on sales in any gallery's settings."] },
  },
  {
    slug: "strona-portfolio",
    visual: "portfolio",
    card: {
      title: ["Strona portfolio", "Portfolio website"],
      text: ["Elegancka strona fotografa z portfolio, ofertą i formularzem kontaktowym.", "An elegant photographer website with portfolio, services and contact form."],
      price: ["24 zł / mies.", "PLN 24 / mo"],
    },
    kicker: ["Strona portfolio", "Portfolio website"],
    title: ["Twoja strona, która wygląda drogo", "A website that looks expensive"],
    lead: [
      "Portfolio, kilka słów o Tobie, oferta z cenami i formularz kontaktowy – w luksusowym, spójnym stylu. Zapytania od klientów przychodzą prosto na Twój e-mail.",
      "Portfolio, a few words about you, services with prices and a contact form – in a luxurious, consistent style. Enquiries go straight to your e-mail.",
    ],
    price: ["24 zł miesięcznie albo 240 zł rocznie", "PLN 24 per month or PLN 240 per year"],
    steps: [
      { title: ["Wybierasz zdjęcia", "Pick photos"], text: ["Okładka, portret i najlepsze kadry do portfolio.", "Cover, portrait and your best shots."] },
      { title: ["Uzupełniasz", "Fill it in"], text: ["O mnie, oferta, telefon, Instagram – z podglądem na żywo.", "About, services, phone, Instagram – with a live preview."] },
      { title: ["Publikujesz", "Publish"], text: ["Strona działa pod Twoim adresem w Lenslie.", "Your site goes live at your Lenslie address."] },
    ],
    forPhotographer: [
      ["Bez programisty i bez płacenia za hosting.", "No developer, no hosting bills."],
      ["Wolne terminy sesji widoczne od razu na stronie.", "Available session slots shown right on the site."],
      ["Jasny albo ciemny wygląd, po polsku lub po angielsku.", "Light or dark look, in Polish or English."],
    ],
    forClient: {
      title: ["Dla Twoich klientów", "For your clients"],
      items: [
        ["Wszystko o Tobie w jednym miejscu.", "Everything about you in one place."],
        ["Szybki kontakt i rezerwacja terminu.", "Quick contact and booking."],
      ],
    },
    band: {
      title: ["Pierwsze wrażenie ma znaczenie", "First impressions matter"],
      points: [
        { title: ["Luksusowy styl", "Luxury style"], text: ["Duże zdjęcia, elegancka typografia.", "Large photos, elegant typography."] },
        { title: ["Na każdym ekranie", "On every screen"], text: ["Świetnie wygląda na telefonie.", "Looks great on phones."] },
        { title: ["Formularz kontaktowy", "Contact form"], text: ["Zapytania prosto na Twój e-mail.", "Enquiries straight to your e-mail."] },
      ],
    },
    cta: { title: ["Postaw swoją stronę w kwadrans", "Launch your site in 15 minutes"], text: ["Podgląd jest za darmo – płacisz, gdy chcesz ją opublikować.", "Preview is free – pay when you publish."] },
  },
  {
    slug: "rezerwacje-sesji",
    visual: "booking",
    card: {
      title: ["Rezerwacje sesji", "Session bookings"],
      text: ["Kalendarz wolnych terminów – klient sam rezerwuje sesję mini, Ty dostajesz powiadomienie.", "A calendar of free slots – clients book mini sessions themselves and you get notified."],
      price: ["za darmo", "free"],
    },
    kicker: ["Rezerwacje sesji", "Session bookings"],
    title: ["Sesje mini, które zapełniają się same", "Mini sessions that fill themselves"],
    lead: [
      "Tworzysz wydarzenie – np. świąteczne sesje mini – i generujesz godziny. Klienci rezerwują wolne terminy przez link, a potwierdzenie z dodaniem do kalendarza dostajecie obaj.",
      "Create an event – e.g. holiday mini sessions – and generate time slots. Clients book free slots via a link, and you both get a confirmation with a calendar invite.",
    ],
    price: ["Bezpłatne dla wszystkich kont", "Free for all accounts"],
    steps: [
      { title: ["Tworzysz wydarzenie", "Create an event"], text: ["Data, miejsce, cena i długość sesji.", "Date, place, price and session length."] },
      { title: ["Udostępniasz link", "Share the link"], text: ["Na Instagramie, Facebooku albo na swojej stronie.", "On Instagram, Facebook or your website."] },
      { title: ["Klienci rezerwują", "Clients book"], text: ["Wybierają godzinę, a Ty dostajesz maila.", "They choose a time and you get an e-mail."] },
    ],
    forPhotographer: [
      ["Koniec z ustalaniem terminów w wiadomościach.", "No more scheduling over messages."],
      ["Wszystkie rezerwacje w jednym miejscu w panelu.", "All bookings in one place in your dashboard."],
      ["Terminy widoczne też na Twojej stronie portfolio.", "Slots also visible on your portfolio site."],
    ],
    forClient: {
      title: ["Dla klientów", "For clients"],
      items: [
        ["Rezerwacja w minutę, o każdej porze.", "Booking in a minute, any time."],
        ["Przypomnienie w kalendarzu telefonu.", "A reminder in the phone's calendar."],
      ],
    },
    band: {
      title: ["Mniej pisania, więcej fotografowania", "Less messaging, more shooting"],
      points: [
        { title: ["Automatyczne godziny", "Automatic slots"], text: ["Generujesz cały dzień jednym kliknięciem.", "Generate a whole day in one click."] },
        { title: ["Potwierdzenia", "Confirmations"], text: ["Mail i plik kalendarza dla obu stron.", "E-mail and calendar file for both sides."] },
        { title: ["Bez opłat", "No fees"], text: ["Funkcja jest w cenie konta.", "Included with your account."] },
      ],
    },
    cta: { title: ["Zaplanuj swoje sesje mini", "Plan your mini sessions"], text: ["Rezerwacje są bezpłatne dla każdego konta.", "Bookings are free for every account."] },
  },
  {
    slug: "filmy-w-galerii",
    visual: "video",
    card: {
      title: ["Filmy w galerii", "Videos in the gallery"],
      text: ["Film z wesela na samej górze galerii – podgląd online i pobranie w oryginale.", "The wedding film at the top of the gallery – online preview and original download."],
      price: ["w cenie galerii", "included in the gallery"],
    },
    kicker: ["Filmy w galerii", "Videos in the gallery"],
    title: ["Zdjęcia i film w jednej galerii", "Photos and film in one gallery"],
    lead: [
      "Dodajesz film do galerii zdjęć, a klient ogląda go na samej górze – na telefonie i komputerze. Pobiera go w pełnej, oryginalnej jakości, bez kompresji.",
      "Add a film to the photo gallery and your client watches it right at the top – on phone and desktop. They download it in full original quality, without compression.",
    ],
    price: ["W cenie galerii – film liczy się tylko do miejsca w pakiecie (GB), razem ze zdjęciami", "Included in the gallery – the film only counts towards the plan's storage (GB), together with photos"],
    steps: [
      { title: ["Wgrywasz film", "Upload the film"], text: ["Nawet duże pliki – wysyłane w częściach, bez zrywania.", "Even large files – uploaded in parts, without dropping."] },
      { title: ["Bez dopłat", "No extra cost"], text: ["Film mieści się w GB pakietu galerii, razem ze zdjęciami.", "The film fits in the gallery plan's GB, together with photos."] },
      { title: ["Klient ogląda", "Client watches"], text: ["Film na górze galerii i przycisk pobrania oryginału.", "Film at the top of the gallery and an original download button."] },
    ],
    forPhotographer: [
      ["Jeden link dla klienta zamiast WeTransfera i dysków.", "One link for your client instead of WeTransfer and drives."],
      ["Kilka filmów w jednej galerii – teledysk, pełny film, highlights.", "Several films in one gallery – trailer, full film, highlights."],
      ["Przedłużenie galerii obejmuje też filmy.", "Extending the gallery extends the films too."],
    ],
    forClient: {
      title: ["Dla pary", "For the couple"],
      items: [
        ["Film i zdjęcia w jednym miejscu.", "Film and photos in one place."],
        ["Pobieranie w oryginalnej rozdzielczości.", "Download in original resolution."],
      ],
    },
    band: {
      title: ["Film traktowany z szacunkiem", "Your film, treated with respect"],
      points: [
        { title: ["Oryginał", "Original"], text: ["Bez kompresji przy pobieraniu.", "No compression on download."] },
        { title: ["Na górze galerii", "Top of the gallery"], text: ["Film pierwszy, zdjęcia poniżej.", "Film first, photos below."] },
        { title: ["Bez dopłat", "No extra cost"], text: ["Film w cenie galerii – w ramach jej GB.", "The film is included – within the gallery's GB."] },
      ],
    },
    cta: { title: ["Oddaj zdjęcia i film razem", "Deliver photos and film together"], text: ["Dodaj film w dowolnej galerii w panelu.", "Add a film in any gallery in your dashboard."] },
  },
  {
    slug: "motywy-galerii",
    visual: "themes",
    card: {
      title: ["Motywy galerii", "Gallery themes"],
      text: ["Czarny elegancki, Minimalistyczny i Rustykalny ślubny – inny klimat dla każdej sesji.", "Noir, Minimal and Rustic wedding – a different mood for every shoot."],
      price: ["19 zł jednorazowo", "PLN 19 one-off"],
    },
    kicker: ["Motywy galerii", "Gallery themes"],
    title: ["Galeria w klimacie sesji", "A gallery that matches the shoot"],
    lead: [
      "Wybierz wygląd galerii, który pasuje do zdjęć: ciemny jak galeria sztuki, czysto minimalistyczny albo rustykalny z odręcznym pismem. Kupujesz raz i używasz we wszystkich galeriach.",
      "Choose a gallery look that suits the photos: dark like an art gallery, clean and minimal, or rustic with handwritten type. Buy once, use in every gallery.",
    ],
    price: ["19 zł jednorazowo za motyw · na zawsze na Twoim koncie", "PLN 19 one-off per theme · yours forever"],
    steps: [
      { title: ["Podglądasz", "Preview"], text: ["Zobacz każdy motyw na swojej galerii przed zakupem.", "See every theme on your gallery before buying."] },
      { title: ["Kupujesz raz", "Buy once"], text: ["Motyw zostaje na koncie na zawsze.", "The theme stays on your account forever."] },
      { title: ["Zmieniasz kiedy chcesz", "Switch any time"], text: ["Inny motyw dla ślubu, inny dla sesji rodzinnej.", "One theme for weddings, another for family shoots."] },
    ],
    forPhotographer: [
      ["Galeria spójna z Twoim stylem i marką.", "A gallery consistent with your style and brand."],
      ["Wyróżniasz się na tle szablonowych galerii.", "Stand out from template galleries."],
    ],
    forClient: {
      title: ["Dla klienta", "For your client"],
      items: [["Zdjęcia podane jak w ekskluzywnym albumie.", "Photos presented like an exclusive album."]],
    },
    band: {
      title: ["Trzy charaktery", "Three characters"],
      points: [
        { title: ["Czarny elegancki", "Noir"], text: ["Ciemne tło, zdjęcia jak w galerii sztuki.", "Dark background, art-gallery feel."] },
        { title: ["Minimalistyczny", "Minimal"], text: ["Czysta biel, nic poza zdjęciami.", "Pure white, nothing but photos."] },
        { title: ["Rustykalny ślubny", "Rustic wedding"], text: ["Kremowy papier i odręczne litery.", "Cream paper and handwritten type."] },
      ],
    },
    cta: { title: ["Nadaj galerii charakter", "Give your gallery character"], text: ["Motyw klasyczny jest zawsze za darmo.", "The classic theme is always free."] },
  },
  {
    slug: "wlasna-domena",
    visual: "domain",
    card: {
      title: ["Własna domena", "Custom domain"],
      text: ["Galerie pod Twoim adresem, np. galerie.twojestudio.pl – bez śladu Lenslie w linku.", "Galleries at your own address, e.g. galleries.yourstudio.com – no Lenslie in the link."],
      price: ["99 zł / rok", "PLN 99 / year"],
    },
    kicker: ["Własna domena", "Custom domain"],
    title: ["Twoje galerie pod Twoim adresem", "Your galleries at your own address"],
    lead: [
      "Klient dostaje link w stylu galerie.twojestudio.pl – profesjonalnie i spójnie z marką. Konfigurujesz to raz, a wszystkie galerie działają pod Twoją domeną.",
      "Your client gets a link like galleries.yourstudio.com – professional and on-brand. Set it up once and every gallery works under your domain.",
    ],
    price: ["99 zł rocznie · potrzebujesz własnej domeny (np. w home.pl)", "PLN 99 per year · you need your own domain"],
    steps: [
      { title: ["Wpisujesz adres", "Enter the address"], text: ["Np. galerie.twojestudio.pl w panelu.", "E.g. galleries.yourstudio.com in your dashboard."] },
      { title: ["Dodajesz rekord DNS", "Add a DNS record"], text: ["Instrukcja krok po kroku, np. dla home.pl.", "Step-by-step instructions."] },
      { title: ["Gotowe", "Done"], text: ["Linki do galerii używają Twojej domeny.", "Gallery links use your domain."] },
    ],
    forPhotographer: [
      ["Marka studia w każdym linku do klienta.", "Your studio brand in every client link."],
      ["Wszystkie galerie od razu pod nowym adresem.", "Every gallery at the new address right away."],
    ],
    forClient: {
      title: ["Dla klienta", "For your client"],
      items: [["Link, który budzi zaufanie i wygląda profesjonalnie.", "A link that feels trustworthy and professional."]],
    },
    band: {
      title: ["Profesjonalny wizerunek", "A professional image"],
      points: [
        { title: ["Twoja marka", "Your brand"], text: ["Bez obcej nazwy w adresie.", "No third-party name in the address."] },
        { title: ["Bezpiecznie", "Secure"], text: ["Certyfikat SSL w cenie.", "SSL certificate included."] },
        { title: ["Raz i spokój", "Set and forget"], text: ["Jedna konfiguracja dla wszystkich galerii.", "One setup for every gallery."] },
      ],
    },
    cta: { title: ["Daj galeriom swój adres", "Give your galleries your address"], text: ["99 zł rocznie za własną domenę.", "PLN 99 per year for your domain."] },
  },
];

// Na stronie głównej również „Znajdź siebie” (ma własną stronę)
export const FIND_ME_CARD = {
  href: "/znajdz-siebie",
  visual: "faces" as FeatureVisual,
  title: ["Znajdź siebie na zdjęciach", "Find yourself in the photos"] as L,
  text: ["Jedno selfie i każdy gość widzi tylko zdjęcia z wesela, na których jest.", "One selfie and every guest sees only the wedding photos they're in."] as L,
  price: ["49 zł za galerię", "PLN 49 per gallery"] as L,
};

export const getFeature = (slug: string) => FEATURES.find((f) => f.slug === slug) ?? null;
