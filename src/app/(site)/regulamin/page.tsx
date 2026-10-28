import Link from "next/link";
import { COMPANY } from "@/lib/company";

import { getLang } from "@/lib/lang-server";

export async function generateMetadata() {
  return { title: (await getLang()) === "en" ? "Terms of service – Lenslie" : "Regulamin – Lenslie" };
}

function RegulaminPl() {
  return (
    <article className="legal">
      {COMPANY.draft && (
        <p className="legal-draft">Wersja robocza. Dokument zostanie sprawdzony przez prawnika przed uruchomieniem płatności.</p>
      )}
      <h1>Regulamin serwisu Lenslie</h1>
      <p className="legal-meta">Obowiązuje od: {COMPANY.effective}</p>

      <h2>§ 1. Postanowienia ogólne</h2>
      <ol>
        <li>
          Regulamin określa zasady korzystania z serwisu Lenslie dostępnego pod adresem lenslie.com (dalej: Serwis), służącego
          do przechowywania i udostępniania klientom galerii zdjęć.
        </li>
        <li>
          Serwis prowadzi {COMPANY.name}, {COMPANY.address}, NIP {COMPANY.nip}, REGON {COMPANY.regon}, e-mail: {COMPANY.email} (dalej: Usługodawca).
        </li>
        <li>
          Regulamin jest regulaminem świadczenia usług drogą elektroniczną w rozumieniu ustawy z dnia 18 lipca 2002 r. o
          świadczeniu usług drogą elektroniczną.
        </li>
      </ol>

      <h2>§ 2. Definicje</h2>
      <ul>
        <li><strong>Fotograf</strong> – osoba, która założyła Konto i tworzy Galerie.</li>
        <li><strong>Klient</strong> – osoba, której Fotograf udostępnia Galerię, oraz goście korzystający z linku dla gości.</li>
        <li><strong>Konto</strong> – indywidualny panel Fotografa w Serwisie.</li>
        <li><strong>Galeria</strong> – zbiór zdjęć udostępniany Klientowi pod osobnym adresem, opcjonalnie chroniony hasłem.</li>
        <li><strong>Pakiet</strong> – wybrany przez Fotografa limit miejsca i okres dostępu dla danej Galerii.</li>
      </ul>

      <h2>§ 3. Wymagania techniczne</h2>
      <p>
        Do korzystania z Serwisu potrzebne jest urządzenie z dostępem do internetu i aktualną przeglądarką (Chrome, Safari,
        Firefox, Edge) z włączoną obsługą JavaScript i plików cookie.
      </p>

      <h2>§ 4. Konto Fotografa</h2>
      <ol>
        <li>Założenie Konta wymaga podania adresu e-mail, hasła i akceptacji Regulaminu oraz Polityki prywatności.</li>
        <li>Fotograf odpowiada za poufność hasła i za działania wykonane z jego Konta.</li>
        <li>Fotograf może w każdej chwili usunąć Konto, pisząc na adres {COMPANY.email}.</li>
      </ol>

      <h2>§ 5. Galerie i Pakiety</h2>
      <ol>
        <li>
          Fotograf wybiera Pakiet dla każdej Galerii. Aktualne ceny, limity miejsca i okresy dostępu podane są w{" "}
          <Link href="/cennik">Cenniku</Link>. Ceny są cenami brutto.
        </li>
        <li>
          Do limitu Pakietu doliczana jest tolerancja 2%. Po jej przekroczeniu przesyłanie zdjęć jest wstrzymane do czasu
          wybrania większego Pakietu.
        </li>
        <li>Zmiana na większy Pakiet wymaga dopłaty różnicy w cenie. Data wygaśnięcia Galerii się nie zmienia.</li>
        <li>Fotograf może przedłużyć dostęp do Galerii przed jego wygaśnięciem lub po nim.</li>
        <li>
          Po wygaśnięciu dostępu Klient traci możliwość oglądania Galerii. Zdjęcia są przechowywane jeszcze 30 dni, po czym
          zostają trwale usunięte. Usługodawca wysyła przypomnienia na adres e-mail Fotografa przed wygaśnięciem i przed
          usunięciem.
        </li>
        <li>Fotograf powinien przechowywać własną kopię zdjęć. Serwis nie jest archiwum ani kopią zapasową.</li>
      </ol>

      <h2>§ 5a. Filmy w Galeriach</h2>
      <ol>
        <li>
          Fotograf może dodać do opublikowanej Galerii filmy. Oryginał jest przechowywany bez zmiany jakości i może być
          pobrany przez Klienta, a do oglądania Serwis przygotowuje automatycznie lżejszą wersję (do 1080p).
        </li>
        <li>
          Cena filmu jest wyliczana po jego przesłaniu, na podstawie wielkości pliku, długości filmu i czasu pozostałego do
          końca dostępu do Galerii, i jest widoczna przed zapłatą. Nieopłacone filmy są usuwane po 7 dniach.
        </li>
        <li>Przy przedłużeniu dostępu do Galerii filmy są przedłużane razem z nią; ich koszt jest doliczany do ceny przedłużenia.</li>
        <li>W usłudze „Zdjęcia od gości” goście mogą przesyłać także filmy (do 4 GB każdy) w ramach opłaty za wydarzenie.</li>
      </ol>

      <h2>§ 6. Płatności</h2>
      <ol>
        <li>Opłata za Pakiet jest pobierana z góry, przy tworzeniu Galerii, zmianie Pakietu lub przedłużeniu dostępu.</li>
        <li>Płatności obsługuje zewnętrzny operator płatności PayPro S.A. (Przelewy24) z siedzibą w Poznaniu.</li>
        <li>Na życzenie Fotografa, zgłoszone przy płatności, wystawiana jest faktura VAT wysyłana na adres e-mail Konta.</li>
        <li>
          Fotograf może doładować Saldo konta kwotą 30, 50, 100 lub 200 zł. Przy doładowaniu 200 zł Usługodawca dolicza
          10 zł bonusu. Ze Salda opłaca się Pakiety, ich zmianę i przedłużenie dostępu.
        </li>
        <li>Faktura za doładowanie Salda wystawiana jest przy wpłacie, na dane podane przez Fotografa.</li>
        <li>
          Fotograf może wykupić dodatek „Własna domena” (99 zł za 12 miesięcy, płatne z Salda), aby Galerie były dostępne
          pod jego subdomeną. Fotograf odpowiada za posiadanie domeny i ustawienie rekordu DNS. Po upływie opłaconego
          okresu Galerie są nadal dostępne pod adresem Serwisu.
        </li>
        <li>
          Saldo nie podlega oprocentowaniu i nie wygasa. Niewykorzystaną część Salda (bez bonusu) Usługodawca zwraca na
          wniosek Fotografa przesłany na adres {COMPANY.email}, w ciągu 14 dni, na rachunek, z którego dokonano wpłaty.
          Bonus nie podlega wypłacie.
        </li>
      </ol>

      <h2>§ 6a. Program poleceń</h2>
      <ol>
        <li>Fotograf może polecić Serwis innym osobom za pomocą indywidualnego linku z zakładki „Moje konto”.</li>
        <li>
          Gdy osoba, która założyła Konto z linku polecającego, wpłaci łącznie co najmniej 30 zł, Fotograf polecający i
          osoba polecona otrzymują po 20 zł bonusu na Saldo konta. Bonus przyznawany jest jednorazowo za każdą poleconą osobę.
        </li>
        <li>Bonus można wykorzystać wyłącznie na usługi Serwisu; nie podlega wypłacie ani zwrotowi.</li>
        <li>
          Zakładanie Kont w celu uzyskania bonusu (np. polecanie samego siebie) jest zabronione. Usługodawca może w takim
          przypadku anulować bonus.
        </li>
      </ol>

      <h2>§ 6b. Sprzedaż zdjęć w Galerii</h2>
      <ol>
        <li>
          Fotograf może włączyć w Galerii wybór i sprzedaż zdjęć: Klient wybiera zdjęcia objęte pakietem ustalonym z
          Fotografem, a za zdjęcia dodatkowe płaci według ceny ustalonej przez Fotografa.
        </li>
        <li>
          Płatności za zdjęcia Klient dokonuje bezpośrednio na rachunek bankowy lub numer telefonu BLIK wskazany przez
          Fotografa. Usługodawca nie przyjmuje tych płatności, nie pośredniczy w nich i nie pobiera od nich prowizji.
        </li>
        <li>
          Stroną umowy sprzedaży zdjęć jest wyłącznie Fotograf i Klient. Fotograf odpowiada za ustalenie ceny,
          potwierdzenie wpłaty, wystawienie dokumentu sprzedaży oraz rozliczenia podatkowe i reklamacje dotyczące zdjęć.
        </li>
      </ol>

      <h2>§ 6c. Zdjęcia od gości</h2>
      <ol>
        <li>
          Usługa „Zdjęcia od gości” pozwala gościom wydarzenia przesyłać zdjęcia przez link lub kod QR, bez zakładania
          konta. Opłata wynosi 99 zł brutto za wydarzenie i obejmuje 12 miesięcy przesyłania i oglądania zdjęć (do 30 GB),
          a następnie 30 dni na ich pobranie, po których zdjęcia są usuwane.
        </li>
        <li>
          Za treści przesłane przez gości odpowiada Fotograf, który utworzył wydarzenie. Fotograf może usuwać przesłane
          zdjęcia, a Usługodawca usuwa treści bezprawne po otrzymaniu zgłoszenia.
        </li>
      </ol>

      <h2>§ 6d. Dodatki</h2>
      <ol>
        <li>Motywy galerii premium kosztują 19 zł brutto za motyw, płatne jednorazowo; zakupiony motyw można używać we wszystkich Galeriach Konta.</li>
        <li>
          Strona portfolio kosztuje 24 zł brutto za miesiąc albo 240 zł brutto za 12 miesięcy, płatne z góry. Po końcu
          opłaconego okresu strona przestaje być widoczna. Fotograf odpowiada za treści i zdjęcia na stronie, w tym za zgody
          osób na nich widocznych.
        </li>
        <li>
          „Znajdź siebie na zdjęciach” kosztuje 49 zł brutto za Galerię, płatne jednorazowo. Fotograf, włączając funkcję,
          potwierdza, że ma podstawę prawną do przetwarzania danych biometrycznych osób na zdjęciach (np. ich zgodę) i że
          zostały one poinformowane o funkcji. Szczegóły w Polityce prywatności.
        </li>
      </ol>

      <h2>§ 7. Treści i prawa autorskie</h2>
      <ol>
        <li>
          Prawa do zdjęć pozostają przy Fotografie lub osobach uprawnionych. Usługodawca nie nabywa żadnych praw do zdjęć i
          nie wykorzystuje ich w celach marketingowych.
        </li>
        <li>
          Fotograf oświadcza, że ma prawo do publikowania przesyłanych zdjęć, w tym zgody osób na nich widocznych, oraz do
          muzyki dodanej do pokazu slajdów.
        </li>
        <li>
          Zabronione jest przesyłanie treści bezprawnych. Usługodawca może zablokować Galerię po otrzymaniu wiarygodnej
          informacji o jej bezprawnym charakterze.
        </li>
      </ol>

      <h2>§ 8. Dane osobowe</h2>
      <ol>
        <li>
          Zasady przetwarzania danych Fotografów opisuje <Link href="/polityka-prywatnosci">Polityka prywatności</Link>.
        </li>
        <li>
          W zakresie zdjęć i danych Klientów (np. imię i e-mail podane przy wyborze ulubionych) administratorem danych jest
          Fotograf, a Usługodawca przetwarza je w jego imieniu jako podmiot przetwarzający. Postanowienia umowy powierzenia
          przetwarzania danych (art. 28 RODO) stanowią Załącznik nr 1 do Regulaminu.
        </li>
      </ol>

      <h2>§ 9. Reklamacje</h2>
      <ol>
        <li>Reklamacje można zgłaszać na adres {COMPANY.email}.</li>
        <li>Usługodawca odpowiada na reklamację w ciągu 14 dni.</li>
      </ol>

      <h2>§ 10. Odstąpienie od umowy</h2>
      <p>
        Fotograf będący konsumentem lub przedsiębiorcą na prawach konsumenta może odstąpić od umowy w ciągu 14 dni. Jeśli
        na jego wyraźne żądanie usługa została w pełni wykonana przed upływem tego terminu, prawo odstąpienia wygasa
        zgodnie z art. 38 ustawy o prawach konsumenta.
      </p>

      <h2>§ 11. Odpowiedzialność</h2>
      <ol>
        <li>Usługodawca dokłada starań, aby Serwis działał bez przerw, i informuje o planowanych pracach technicznych.</li>
        <li>
          Odpowiedzialność Usługodawcy wobec Fotografów będących przedsiębiorcami jest ograniczona do kwoty opłat
          wniesionych za daną Galerię.
        </li>
      </ol>

      <h2>§ 12. Postanowienia końcowe</h2>
      <ol>
        <li>Usługodawca może zmienić Regulamin z ważnych przyczyn, informując Fotografów e-mailem co najmniej 14 dni wcześniej.</li>
        <li>W sprawach nieuregulowanych stosuje się przepisy prawa polskiego.</li>
      </ol>

      <h2>Załącznik nr 1. Umowa powierzenia przetwarzania danych</h2>
      <ol>
        <li>Fotograf (administrator) powierza Usługodawcy (podmiotowi przetwarzającemu) przetwarzanie danych osobowych zawartych w zdjęciach oraz danych Klientów w zakresie niezbędnym do przechowywania i udostępniania Galerii.</li>
        <li>Usługodawca przetwarza dane wyłącznie na udokumentowane polecenie Fotografa, którym jest korzystanie z funkcji Serwisu, przez czas trwania umowy.</li>
        <li>Usługodawca zapewnia poufność danych, stosuje szyfrowanie połączeń, ograniczenie dostępu i hasła do Galerii oraz pomaga Fotografowi w realizacji praw osób, których dane dotyczą.</li>
        <li>Fotograf wyraża zgodę na korzystanie z podprzetwarzających: Cloudflare (przechowywanie zdjęć w UE), Supabase (baza danych w UE), Vercel (hosting), Resend (wysyłka e-maili).</li>
        <li>Po wygaśnięciu Galerii lub usunięciu Konta dane są usuwane zgodnie z § 5 ust. 5.</li>
        <li>Usługodawca niezwłocznie informuje Fotografa o naruszeniu ochrony danych dotyczącym jego Galerii.</li>
      </ol>
    </article>
  );
}

function TermsEn() {
  return (
    <article className="legal">
      <p className="legal-draft">
        English translation for information. In case of any discrepancy, the <strong>Polish version</strong> prevails.
      </p>
      <h1>Lenslie Terms of Service</h1>
      <p className="legal-meta">Effective from: 27 October 2026</p>

      <h2>§ 1. General provisions</h2>
      <ol>
        <li>These Terms set out the rules for using Lenslie, available at lenslie.com (the “Service”), used to store photo galleries and share them with clients.</li>
        <li>The Service is operated by {COMPANY.name}, {COMPANY.address}, Poland, VAT ID (NIP) {COMPANY.nip}, REGON {COMPANY.regon}, email: {COMPANY.email} (the “Provider”).</li>
        <li>These Terms are terms of providing electronic services within the meaning of the Polish Act of 18 July 2002 on providing services by electronic means.</li>
      </ol>

      <h2>§ 2. Definitions</h2>
      <ul>
        <li><strong>Photographer</strong> – a person who has created an Account and creates Galleries.</li>
        <li><strong>Client</strong> – a person to whom the Photographer shares a Gallery, and guests using a guest link.</li>
        <li><strong>Account</strong> – the Photographer’s individual dashboard in the Service.</li>
        <li><strong>Gallery</strong> – a set of photos shared with a Client at a separate address, optionally password protected.</li>
        <li><strong>Plan</strong> – the storage limit and access period chosen by the Photographer for a Gallery.</li>
      </ul>

      <h2>§ 3. Technical requirements</h2>
      <p>Using the Service requires an internet-connected device with an up-to-date browser (Chrome, Safari, Firefox, Edge) with JavaScript and cookies enabled.</p>

      <h2>§ 4. Photographer’s Account</h2>
      <ol>
        <li>Creating an Account requires an email address, a password and acceptance of these Terms and the Privacy Policy.</li>
        <li>The Photographer is responsible for keeping the password confidential and for actions performed from the Account.</li>
        <li>The Photographer may delete the Account at any time by writing to {COMPANY.email}.</li>
      </ol>

      <h2>§ 5. Galleries and Plans</h2>
      <ol>
        <li>The Photographer chooses a Plan for each Gallery. Current prices, storage limits and access periods are listed on the <Link href="/cennik">Pricing</Link> page. Prices are gross prices in Polish złoty (PLN).</li>
        <li>A 2% tolerance is added to the Plan limit. Once exceeded, uploading is paused until a bigger Plan is chosen.</li>
        <li>Upgrading to a bigger Plan requires paying the price difference. The Gallery expiry date does not change.</li>
        <li>The Photographer may extend access to a Gallery before or after it expires.</li>
        <li>After access expires, the Client can no longer view the Gallery. Photos are kept for another 30 days and then permanently deleted. The Provider sends reminders to the Photographer’s email before expiry and before deletion.</li>
        <li>Unpublished gallery drafts are deleted 20 days after creation, with a reminder sent after 10 days.</li>
        <li>The Photographer should keep their own copy of the photos. The Service is not an archive or a backup.</li>
      </ol>

      <h2>§ 5a. Videos in Galleries</h2>
      <ol>
        <li>The Photographer may add videos to a published Gallery. The original is stored without any change in quality and can be downloaded by the Client; for viewing, the Service automatically prepares a lighter version (up to 1080p).</li>
        <li>The video price is calculated after upload, based on file size, video length and the time left until the Gallery access ends, and is shown before payment. Unpaid videos are deleted after 7 days.</li>
        <li>When Gallery access is extended, its videos are extended with it; their cost is added to the extension price.</li>
        <li>In the “Guest uploads” service guests may also upload videos (up to 4 GB each) within the event fee.</li>
      </ol>

      <h2>§ 6. Payments</h2>
      <ol>
        <li>Plan fees are charged in advance, when publishing a Gallery, changing a Plan or extending access.</li>
        <li>Payments are processed by PayPro S.A. (Przelewy24), Poznań, Poland. Payments are made in PLN.</li>
        <li>At the Photographer’s request made during payment, a VAT invoice is issued and sent to the Account email.</li>
        <li>The Photographer may top up the Account balance with PLN 30, 50, 100 or 200. A top-up of PLN 200 includes a PLN 10 bonus. The balance can be used to pay for Plans, upgrades and extensions.</li>
        <li>An invoice for a balance top-up is issued at the time of payment, using the details provided by the Photographer.</li>
        <li>The Photographer may purchase the “Custom domain” add-on (PLN 99 per 12 months, paid from the balance) so that Galleries are available under their subdomain. The Photographer is responsible for owning the domain and setting the DNS record. After the paid period ends, Galleries remain available at the Service address.</li>
        <li>The balance bears no interest and does not expire. The unused part of the balance (excluding bonuses) is refunded at the Photographer’s request sent to {COMPANY.email}, within 14 days, to the account the payment was made from. Bonuses are not refundable.</li>
      </ol>

      <h2>§ 6a. Referral programme</h2>
      <ol>
        <li>The Photographer may recommend the Service using a personal link from “My account”.</li>
        <li>When a person who signed up using the referral link has paid a total of at least PLN 30, both the referring Photographer and the referred person receive a PLN 20 bonus to their balance, once per referred person.</li>
        <li>Bonuses can only be used for the Service; they cannot be withdrawn or refunded.</li>
        <li>Creating Accounts to obtain bonuses (e.g. referring yourself) is prohibited; the Provider may cancel such bonuses.</li>
      </ol>

      <h2>§ 6b. Photo sales in Galleries</h2>
      <ol>
        <li>The Photographer may turn on photo selection and sales in a Gallery: the Client chooses the photos included in the package agreed with the Photographer and pays the Photographer’s price for extra photos.</li>
        <li>The Client pays for photos directly to the bank account or BLIK phone number provided by the Photographer. The Provider does not receive or intermediate these payments and charges no commission on them.</li>
        <li>The photo sale agreement is concluded solely between the Photographer and the Client. The Photographer is responsible for pricing, confirming payments, issuing sales documents, taxes and complaints concerning the photos.</li>
      </ol>

      <h2>§ 6c. Guest uploads</h2>
      <ol>
        <li>The “Guest uploads” service lets event guests upload photos via a link or QR code without an account. The fee is PLN 99 gross per event and covers 12 months of uploading and viewing (up to 30 GB), followed by 30 days to download the photos, after which they are deleted.</li>
        <li>The Photographer who created the event is responsible for content uploaded by guests. The Photographer can delete uploaded photos, and the Provider removes unlawful content upon notice.</li>
      </ol>

      <h2>§ 6d. Add-ons</h2>
      <ol>
        <li>Premium gallery themes cost PLN 19 gross per theme, paid once; a purchased theme can be used in all Galleries of the Account.</li>
        <li>The portfolio website costs PLN 24 gross per month or PLN 240 gross for 12 months, paid in advance. When the paid period ends, the website is no longer visible. The Photographer is responsible for the content and photos on the website, including the consent of the people in them.</li>
        <li>“Find yourself in the photos” costs PLN 49 gross per Gallery, paid once. By turning it on, the Photographer confirms they have a legal basis to process biometric data of the people in the photos (e.g. their consent) and that they have been informed. See the Privacy policy for details.</li>
      </ol>

      <h2>§ 7. Content and copyright</h2>
      <ol>
        <li>Rights to the photos remain with the Photographer or other right holders. The Provider acquires no rights to the photos and does not use them for marketing.</li>
        <li>The Photographer confirms they have the right to publish the uploaded photos, including consent of the people shown, and to any music added to slideshows.</li>
        <li>Uploading unlawful content is prohibited. The Provider may block a Gallery after receiving credible information that it is unlawful.</li>
      </ol>

      <h2>§ 8. Personal data</h2>
      <ol>
        <li>The processing of Photographers’ data is described in the <Link href="/polityka-prywatnosci">Privacy Policy</Link>.</li>
        <li>For photos and Clients’ data (e.g. name and email given when choosing favourites), the Photographer is the controller and the Provider processes the data on the Photographer’s behalf as a processor. The data processing provisions (Art. 28 GDPR) are set out in Annex 1.</li>
      </ol>

      <h2>§ 9. Complaints</h2>
      <ol>
        <li>Complaints can be sent to {COMPANY.email}.</li>
        <li>The Provider responds to complaints within 14 days.</li>
      </ol>

      <h2>§ 10. Right of withdrawal</h2>
      <p>A Photographer who is a consumer (or a sole trader with consumer rights) may withdraw from the contract within 14 days. If, at their express request, the service has been fully performed before that period ends, the right of withdrawal expires in accordance with Art. 38 of the Polish Consumer Rights Act.</p>

      <h2>§ 11. Liability</h2>
      <ol>
        <li>The Provider makes every effort to keep the Service running without interruption and announces planned maintenance.</li>
        <li>The Provider’s liability towards business Photographers is limited to the fees paid for the Gallery concerned.</li>
      </ol>

      <h2>§ 12. Final provisions</h2>
      <ol>
        <li>The Provider may amend these Terms for important reasons, notifying Photographers by email at least 14 days in advance.</li>
        <li>Matters not covered by these Terms are governed by Polish law. This does not deprive consumers of the protection granted by the mandatory laws of their country of residence.</li>
      </ol>

      <h2>Annex 1. Data processing agreement</h2>
      <ol>
        <li>The Photographer (controller) entrusts the Provider (processor) with processing personal data contained in photos and Clients’ data to the extent necessary to store and share Galleries.</li>
        <li>The Provider processes data only on the Photographer’s documented instructions, i.e. by the use of the Service’s features, for the duration of the contract.</li>
        <li>The Provider ensures confidentiality, uses encrypted connections, access restrictions and gallery passwords, and helps the Photographer fulfil data subjects’ rights.</li>
        <li>The Photographer agrees to the use of sub-processors: Cloudflare (photo storage in the EU), Supabase (database in the EU), Vercel (hosting), Resend (email delivery), PayPro S.A. (payments).</li>
        <li>After a Gallery expires or the Account is deleted, the data is deleted in accordance with § 5.</li>
        <li>The Provider informs the Photographer without undue delay of any personal data breach affecting their Galleries.</li>
      </ol>
    </article>
  );
}

export default async function Regulamin() {
  return (await getLang()) === "en" ? <TermsEn /> : <RegulaminPl />;
}
