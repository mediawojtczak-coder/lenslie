import Link from "next/link";
import { COMPANY } from "@/lib/company";

export const metadata = { title: "Regulamin – Lenslie" };

export default function Regulamin() {
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

      <h2>§ 6. Płatności</h2>
      <ol>
        <li>Opłata za Pakiet jest pobierana z góry, przy tworzeniu Galerii, zmianie Pakietu lub przedłużeniu dostępu.</li>
        <li>Płatności obsługuje zewnętrzny operator płatności PayPro S.A. (Przelewy24) z siedzibą w Poznaniu.</li>
        <li>Faktura lub rachunek jest wysyłany na adres e-mail Fotografa.</li>
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
