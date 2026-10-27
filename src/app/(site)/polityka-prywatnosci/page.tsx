import { COMPANY } from "@/lib/company";

import { getLang } from "@/lib/lang-server";

export async function generateMetadata() {
  return { title: (await getLang()) === "en" ? "Privacy policy – Lenslie" : "Polityka prywatności – Lenslie" };
}

function PolitykaPl() {
  return (
    <article className="legal">
      {COMPANY.draft && (
        <p className="legal-draft">Wersja robocza. Dokument zostanie sprawdzony przez prawnika przed uruchomieniem płatności.</p>
      )}
      <h1>Polityka prywatności</h1>
      <p className="legal-meta">Obowiązuje od: {COMPANY.effective}</p>

      <h2>1. Administrator danych</h2>
      <p>
        Administratorem danych Fotografów korzystających z Lenslie jest {COMPANY.name}, {COMPANY.address}, NIP{" "}
        {COMPANY.nip}. Kontakt w sprawach danych osobowych: {COMPANY.email}.
      </p>
      <p>
        Zdjęcia w galeriach oraz dane Klientów (np. imię i e-mail podane przy wyborze ulubionych zdjęć) przetwarzamy w
        imieniu Fotografa, który jest ich administratorem. W tych sprawach Klient powinien kontaktować się z Fotografem.
      </p>

      <h2>2. Jakie dane przetwarzamy i po co</h2>
      <ul>
        <li>
          <strong>Konto Fotografa</strong>: e-mail, hasło (w postaci zaszyfrowanej), nazwa studia, logo – w celu świadczenia
          usługi (art. 6 ust. 1 lit. b RODO).
        </li>
        <li>
          <strong>Płatności i faktury</strong>: dane do rozliczeń – w celu wypełnienia obowiązków podatkowych (art. 6 ust. 1
          lit. c RODO).
        </li>
        <li>
          <strong>Statystyki galerii</strong>: liczba otwarć i pobrań, bez identyfikowania osób – w celu pokazania ich
          Fotografowi (art. 6 ust. 1 lit. f RODO).
        </li>
        <li>
          <strong>Wiadomości e-mail</strong>: przypomnienia o wygasaniu galerii i powiadomienia o wyborach Klientów – jako
          część usługi.
        </li>
      </ul>

      <h2>3. Jak długo przechowujemy dane</h2>
      <ul>
        <li>Zdjęcia: do 30 dni po wygaśnięciu dostępu do galerii, potem są trwale usuwane.</li>
        <li>Dane Konta: do czasu usunięcia Konta.</li>
        <li>Dane rozliczeniowe: przez okres wymagany przepisami podatkowymi (5 lat).</li>
        <li>Statystyki: do 90 dni w widoku panelu, usuwane razem z galerią.</li>
      </ul>

      <h2>4. Komu powierzamy dane</h2>
      <p>Korzystamy ze sprawdzonych dostawców, z którymi mamy umowy powierzenia danych:</p>
      <ul>
        <li>Cloudflare – przechowywanie zdjęć (magazyn R2 w Unii Europejskiej),</li>
        <li>Supabase – konta i baza danych (serwery w Unii Europejskiej, Irlandia),</li>
        <li>Vercel – hosting strony,</li>
        <li>Resend – wysyłka wiadomości e-mail,</li>
        <li>PayPro S.A. (Przelewy24) – obsługa płatności.</li>
      </ul>
      <p>
        Część dostawców ma siedzibę w USA. Przekazanie danych odbywa się na podstawie standardowych klauzul umownych lub
        programu EU-US Data Privacy Framework.
      </p>

      <h2>5. Pliki cookie</h2>
      <p>Używamy wyłącznie niezbędnych plików cookie i pamięci przeglądarki:</p>
      <ul>
        <li>sesja zalogowanego Fotografa,</li>
        <li>dostęp do galerii chronionej hasłem (30 dni),</li>
        <li>wybór ulubionych zdjęć Klienta,</li>
        <li>jednorazowe zliczenie otwarcia galerii w ramach wizyty,</li>
        <li>wybrany język serwisu.</li>
      </ul>
      <p>Nie używamy cookie reklamowych ani zewnętrznych narzędzi analitycznych.</p>

      <h2>6. Twoje prawa</h2>
      <p>
        Masz prawo dostępu do danych, ich sprostowania, usunięcia, ograniczenia przetwarzania, przeniesienia oraz
        sprzeciwu. Możesz też złożyć skargę do Prezesa Urzędu Ochrony Danych Osobowych. Aby skorzystać z praw, napisz na{" "}
        {COMPANY.email}.
      </p>
    </article>
  );
}

function PrivacyEn() {
  return (
    <article className="legal">
      <p className="legal-draft">
        English translation for information. In case of any discrepancy, the <strong>Polish version</strong> prevails.
      </p>
      <h1>Privacy policy</h1>
      <p className="legal-meta">Effective from: 27 October 2026</p>

      <h2>1. Data controller</h2>
      <p>
        The controller of the personal data of photographers using Lenslie is {COMPANY.name}, {COMPANY.address}, Poland, VAT ID (NIP){" "}
        {COMPANY.nip}. Contact for data protection matters: {COMPANY.email}.
      </p>
      <p>
        We process photos in galleries and Clients’ data (e.g. the name and email given when choosing favourites) on behalf of the
        Photographer, who is the controller of that data. Clients should contact the Photographer about it.
      </p>

      <h2>2. What data we process and why</h2>
      <ul>
        <li><strong>Photographer’s account</strong>: email, password (encrypted), studio name, logo – to provide the service (Art. 6(1)(b) GDPR).</li>
        <li><strong>Payments and invoices</strong>: billing details – to meet tax obligations (Art. 6(1)(c) GDPR).</li>
        <li><strong>Gallery statistics</strong>: number of views and downloads, without identifying people – to show them to the Photographer (Art. 6(1)(f) GDPR).</li>
        <li><strong>Emails</strong>: gallery expiry reminders and notifications about Clients’ selections – as part of the service.</li>
      </ul>

      <h2>3. How long we keep data</h2>
      <ul>
        <li>Photos: up to 30 days after gallery access expires, then permanently deleted.</li>
        <li>Account data: until the account is deleted.</li>
        <li>Billing data: for the period required by tax law (5 years).</li>
        <li>Statistics: up to 90 days in the dashboard, deleted together with the gallery.</li>
      </ul>

      <h2>4. Who we share data with</h2>
      <p>We use trusted providers with whom we have data processing agreements:</p>
      <ul>
        <li>Cloudflare – photo storage (R2 storage in the European Union),</li>
        <li>Supabase – accounts and database (servers in the European Union, Ireland),</li>
        <li>Vercel – website hosting,</li>
        <li>Resend – email delivery,</li>
        <li>PayPro S.A. (Przelewy24) – payment processing.</li>
      </ul>
      <p>Some providers are based in the USA. Data transfers are based on standard contractual clauses or the EU-US Data Privacy Framework.</p>

      <h2>5. Cookies</h2>
      <p>We only use strictly necessary cookies and browser storage:</p>
      <ul>
        <li>the logged-in Photographer’s session,</li>
        <li>access to a password-protected gallery (30 days),</li>
        <li>the Client’s favourites selection,</li>
        <li>counting a gallery view once per visit,</li>
        <li>the selected website language.</li>
      </ul>
      <p>We do not use advertising cookies or third-party analytics.</p>

      <h2>6. Your rights</h2>
      <p>
        You have the right to access, rectify and erase your data, to restrict processing, to data portability and to object. You
        may also lodge a complaint with the President of the Polish Personal Data Protection Office (UODO) or your local supervisory
        authority. To exercise your rights, write to {COMPANY.email}.
      </p>
    </article>
  );
}

export default async function Polityka() {
  return (await getLang()) === "en" ? <PrivacyEn /> : <PolitykaPl />;
}
