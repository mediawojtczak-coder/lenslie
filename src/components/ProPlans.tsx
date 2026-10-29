import Link from "next/link";
import { money } from "@/lib/lang";
import { PRO_TIERS, proName, compareFor, COMPARE_ADDONS, COMPARE_GALLERY_GB, COMPARE_GALLERY_PRICE } from "@/lib/pro-plans";

// Pakiety Pro na stronie cennika: karty i porównanie z cenami za pojedyncze galerie i dodatki
export default function ProPlans({ lang }: { lang: "pl" | "en" }) {
  const t = (pl: string, en: string) => (lang === "en" ? en : pl);
  const n = (v: number) => v.toLocaleString(lang === "en" ? "en-GB" : "pl-PL");
  const included = [
    t("Galerie bez opłat za publikację", "Publish galleries at no extra cost"),
    t("Galerie nie wygasają, dopóki trwa abonament", "Galleries don't expire while you're subscribed"),
    t("Filmy w galerii bez dopłat", "Videos at no extra cost"),
    t("Wszystkie płatne dodatki w cenie", "All paid add-ons included"),
  ];

  return (
    <section className="pro-plans" id="pro">
      <div className="pro-plans-head">
        <p className="fs-kicker">{t("Dla firm i studiów", "For studios and businesses")}</p>
        <h2>{t("Pakiety Pro – jeden abonament na wszystko", "Pro plans – one subscription for everything")}</h2>
        <p>
          {t(
            "Robisz dużo sesji? Zamiast płacić za każdą galerię – stała opłata za miejsce na wszystkie galerie i filmy. Motywy, Moja strona, własna domena, Znajdź siebie, Projektor albumów i Zdjęcia od gości w cenie.",
            "Shooting a lot? Instead of paying per gallery – one fee for storage for all your galleries and videos. Themes, My website, custom domain, Find me, Album designer and Guest uploads included.",
          )}
        </p>
      </div>

      <div className="pro-cards">
        {PRO_TIERS.map((x) => (
          <article key={x.id} className={x.featured ? "plan featured" : "plan"}>
            {x.featured && <p className="plan-flag">{t("Najczęściej wybierany", "Most popular")}</p>}
            <h3>{proName(x)}</h3>
            <p className="plan-for">
              {t(`ok. ${n(Math.round((x.gb * 1024) / 7.5 / 1000))} tys. zdjęć w pełnej rozdzielczości`, `approx. ${n(Math.round((x.gb * 1024) / 7.5 / 1000))},000 full-resolution photos`)}
            </p>
            <p className="plan-price">
              <span className="amount">{money(x.monthly, lang)}</span>
              <span className="per">{t("miesięcznie", "a month")}</span>
            </p>
            <p className="plan-month">
              {t("albo", "or")} <strong>{money(x.yearly, lang)}</strong> {t("za rok z góry", "paid yearly in advance")}
            </p>
            <ul className="plan-facts">
              <li>
                <strong>{x.gb >= 1000 ? `${x.gb / 1000} TB` : `${x.gb} GB`}</strong> {t("na wszystkie galerie i filmy", "for all galleries and videos")}
              </li>
              {included.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
            <Link href="/rejestracja" className={x.featured ? "btn btn-wide" : "btn btn-ghost btn-wide"}>
              {t("Załóż konto", "Sign up")}
            </Link>
          </article>
        ))}
      </div>

      <div className="pro-compare">
        <h3>{t("Porównanie z cenami za pojedyncze galerie", "Compared with per-gallery prices")}</h3>
        <p className="pro-compare-lead">
          {t(
            `Przykład na rok: tyle dużych galerii ślubnych (ok. ${COMPARE_GALLERY_GB} GB, dostęp 12 miesięcy), ile zmieści się w pakiecie, plus typowe dodatki – w obecnych cenach Lenslie.`,
            `A one-year example: as many large wedding galleries (approx. ${COMPARE_GALLERY_GB} GB, 12-month access) as fit in the plan, plus typical add-ons – at current Lenslie prices.`,
          )}
        </p>
        <div className="table-wrap">
          <table className="pro-table">
            <thead>
              <tr>
                <th scope="col">{t("Na rok", "Per year")}</th>
                {PRO_TIERS.map((x) => (
                  <th key={x.id} scope="col">
                    {proName(x)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">{t(`Duże galerie po ${COMPARE_GALLERY_PRICE} zł`, `Large galleries at PLN ${COMPARE_GALLERY_PRICE}`)}</th>
                {PRO_TIERS.map((x) => {
                  const c = compareFor(x);
                  return (
                    <td key={x.id}>
                      {c.galleries} × = {money(c.galleryCost, lang)}
                    </td>
                  );
                })}
              </tr>
              {COMPARE_ADDONS.map((a) => (
                <tr key={a.pl}>
                  <th scope="row">{lang === "en" ? a.en : a.pl}</th>
                  {PRO_TIERS.map((x) => (
                    <td key={x.id}>{money(a.price, lang)}</td>
                  ))}
                </tr>
              ))}
              <tr className="pro-row-sum">
                <th scope="row">{t("Razem osobno", "Total separately")}</th>
                {PRO_TIERS.map((x) => (
                  <td key={x.id}>{money(compareFor(x).separately, lang)}</td>
                ))}
              </tr>
              <tr className="pro-row-pro">
                <th scope="row">{t("Abonament Pro na rok", "Pro subscription per year")}</th>
                {PRO_TIERS.map((x) => (
                  <td key={x.id}>{money(x.yearly, lang)}</td>
                ))}
              </tr>
              <tr className="pro-row-save">
                <th scope="row">{t("Oszczędzasz", "You save")}</th>
                {PRO_TIERS.map((x) => (
                  <td key={x.id}>{money(compareFor(x).saving, lang)}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="hint-inline">
          {t(
            "Filmy w galeriach Pro są w cenie i liczą się do miejsca. Abonament nie odnawia się sam; po jego końcu galerie działają jeszcze 30 dni. Wydruk albumów zamawiasz osobno.",
            "Videos in Pro galleries are included and count towards storage. The subscription doesn't renew automatically; after it ends galleries keep working for 30 days. Printed albums are ordered separately.",
          )}
        </p>
      </div>
    </section>
  );
}
