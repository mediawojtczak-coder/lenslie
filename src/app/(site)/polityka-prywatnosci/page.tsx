import { COMPANY } from "@/lib/company";

export const metadata = { title: "Polityka prywatności – Lenslie" };

export default function Polityka() {
  return (
    <article className="legal">
      {COMPANY.draft && (
        <p className="legal-draft">Wersja robocza. Dokument zostanie sprawdzony przez prawnika przed uruchomieniem płatności.</p>
      )}
      <h1>Polityka prywatności</h1>
      <p className="legal-meta">Obowiązuje od: [DATA]</p>

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
        <li>[OPERATOR PŁATNOŚCI] – obsługa płatności.</li>
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
        <li>jednorazowe zliczenie otwarcia galerii w ramach wizyty.</li>
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
