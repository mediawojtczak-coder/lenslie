import type { Metadata } from "next";
import Link from "next/link";
import { PLANS, RENEWAL_SHARE } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Cennik – Lenslie",
  description: "Płacisz tylko za galerie, które oddajesz klientom. Bez abonamentu.",
};

const fmtPrice = (n: number) => n.toLocaleString("pl-PL", { maximumFractionDigits: 2 });
const fmtGb = (n: number) => `${n.toLocaleString("pl-PL")} GB`;

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
    q: "Co się dzieje, gdy minie 12 miesięcy?",
    a: "Na 14 dni przed końcem dostaniesz przypomnienie. Galerię możesz przedłużyć o kolejny rok albo pozwolić jej wygasnąć – wtedy klient traci do niej dostęp, a zdjęcia są usuwane po 30 dniach.",
  },
  {
    q: "Ile kosztuje przedłużenie?",
    a: `Kolejne 12 miesięcy kosztuje ${Math.round(RENEWAL_SHARE * 100)}% ceny pakietu, np. ${fmtPrice(
      PLANS[1].price * RENEWAL_SHARE,
    )} zł za galerię Średnią.`,
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
          Wybierz pakiet dopasowany do sesji. Każda galeria jest dostępna dla klienta przez 12 miesięcy,
          z wszystkimi funkcjami w cenie.
        </p>
      </section>

      <section className="plans" aria-label="Pakiety">
        {PLANS.map((p) => (
          <article key={p.id} className={p.featured ? "plan featured" : "plan"}>
            {p.featured && <p className="plan-flag">Najczęściej wybierana</p>}
            <h2>{p.name}</h2>
            <p className="plan-for">{p.forWhom}</p>
            <p className="plan-price">
              <span className="amount">{fmtPrice(p.price)} zł</span>
              <span className="per">za galerię</span>
            </p>
            <ul className="plan-facts">
              <li>
                <strong>do {fmtGb(p.limitGb)}</strong> {p.photos} w pełnej rozdzielczości
              </li>
              <li>
                <strong>{p.months} miesięcy</strong> dostępu dla klienta
              </li>
              <li>
                Przedłużenie o rok za <strong>{fmtPrice(p.price * RENEWAL_SHARE)} zł</strong>
              </li>
            </ul>
            <Link href="/logowanie" className={p.featured ? "btn btn-wide" : "btn btn-ghost btn-wide"}>
              Wybieram {p.name.toLowerCase()}
            </Link>
          </article>
        ))}
      </section>

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
