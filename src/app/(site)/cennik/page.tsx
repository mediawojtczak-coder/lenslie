import type { Metadata } from "next";
import Link from "next/link";
import PricingPlans from "@/components/PricingPlans";

export const metadata: Metadata = {
  title: "Cennik – Lenslie",
  description: "Płacisz tylko za galerie, które oddajesz klientom. Bez abonamentu.",
};

const INCLUDED = [
  "Prywatny link i hasło dla klienta",
  "Pobieranie w pełnej rozdzielczości i w wersji do internetu",
  "Cała sesja jednym kliknięciem jako ZIP",
  "Okładka na pełnym ekranie i podgląd zdjęć w powiększeniu",
  "Kod QR i gotowa wiadomość dla klienta",
  "Bez reklam i bez kompresji oryginałów",
  "Zdjęcia przechowywane na serwerach w Unii Europejskiej",
];

const FAQ = [
  {
    q: "Co się dzieje, gdy minie okres dostępu?",
    a: "Na 14 dni przed końcem dostaniesz przypomnienie. Galerię możesz przedłużyć albo pozwolić jej wygasnąć – wtedy klient traci do niej dostęp, a zdjęcia są usuwane po 30 dniach.",
  },
  {
    q: "Jak przedłużyć galerię?",
    a: "Jednym kliknięciem w panelu – wybierasz kolejny okres dostępu w cenie z cennika.",
  },
  {
    q: "Co, jeśli zdjęć będzie więcej, niż zakładałem?",
    a: "W każdej chwili zmienisz pakiet na większy i dopłacisz tylko różnicę w cenie.",
  },
  {
    q: "Czy muszę płacić abonament?",
    a: "Nie. Płacisz tylko za galerie, które publikujesz. Konto, panel i galerie robocze są bezpłatne.",
  },
];

export default function Cennik() {
  return (
    <div className="pricing">
      <section className="pricing-head">
        <h1>Płacisz za galerię, nie za abonament</h1>
        <p>
          Wybierz pakiet dopasowany do sesji i to, jak długo klient ma mieć dostęp do zdjęć.
          Wszystkie funkcje są w cenie.
        </p>
      </section>

      <PricingPlans />

      <section className="included">
        <h2>W każdym pakiecie</h2>
        <ul>
          {INCLUDED.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="faq">
        <h2>Najczęstsze pytania</h2>
        {FAQ.map((f) => (
          <details key={f.q}>
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
      </section>
    </div>
  );
}
