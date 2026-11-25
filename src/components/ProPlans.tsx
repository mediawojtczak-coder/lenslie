import Link from "next/link";
import { money, usdify } from "@/lib/lang";
import { addonPriceF, fmtCur, galleryPriceF, proPriceF, type Cur } from "@/lib/foreign-prices";
import { PHOTO_TIERS, FILM_TIERS, proName, compareFor, COMPARE_ADDONS, COMPARE_GALLERY_GB, COMPARE_GALLERY_PRICE } from "@/lib/pro-plans";

// Pakiety Pro na stronie cennika: karty i porównanie z cenami za pojedyncze galerie i dodatki
export default function ProPlans({ lang, cur = null }: { lang: "pl" | "en"; cur?: Cur | null }) {
  const t = (pl: string, en: string) => (lang === "en" ? (cur ? en : usdify(en)) : pl);
  // kwota w walucie klienta (gdy płatności kartą) albo w złotych
  const m = (pln: number, foreign: number) => (cur ? fmtCur(foreign, cur) : money(pln, lang));
  // porównanie w walucie: duże galerie na 12 mies. i dodatki w kolejności COMPARE_ADDONS
  const fAddons = cur
    ? [addonPriceF("portfolio", cur, 12), addonPriceF("album", cur, 12), addonPriceF("domain", cur), 3 * addonPriceF("theme", cur), 5 * addonPriceF("faces", cur), 2 * addonPriceF("guests", cur)]
    : [];
  const fCompare = (x: (typeof PHOTO_TIERS)[number]) => {
    if (!cur) return { gallery: 0, galleryCost: 0, separately: 0, yearly: 0, saving: 0 };
    const c = compareFor(x);
    const gallery = galleryPriceF("duza", 12, cur);
    const galleryCost = c.galleries * gallery;
    const separately = galleryCost + fAddons.reduce((a, b) => a + b, 0);
    const yearly = proPriceF(x.id, 12, cur);
    return { gallery, galleryCost, separately, yearly, saving: Math.max(0, separately - yearly) };
  };
  const n = (v: number) => v.toLocaleString(lang === "en" ? "en-GB" : "pl-PL");
  const included = [
    t("Galerie bez opłat za publikację", "Publish galleries at no extra cost"),
    t("Galerie nie wygasają, dopóki trwa abonament", "Galleries don't expire while you're subscribed"),
    t("Wszystkie płatne dodatki w cenie", "All paid add-ons included"),
  ];

  const card = (x: (typeof PHOTO_TIERS)[number]) => (
          <article key={x.id} className={x.featured ? "plan featured" : "plan"}>
            {x.featured && <p className="plan-flag">{t("Najczęściej wybierany", "Most popular")}</p>}
            <h3>{proName(x)}</h3>
            <p className="plan-for">
              {x.film
                ? t(`ok. ${Math.round(x.videoHours / 1.5)} wesel rocznie (teledysk + reportaż)`, `approx. ${Math.round(x.videoHours / 1.5)} weddings a year (highlights + full film)`)
                : t(`ok. ${n(Math.round((x.gb * 1000) / 7.5 / 1000))} tys. zdjęć w pełnej rozdzielczości`, `approx. ${n(Math.round((x.gb * 1000) / 7.5 / 1000))},000 full-resolution photos`)}
            </p>
            <p className="plan-price">
              <span className="amount">{m(x.monthly, cur ? proPriceF(x.id, 1, cur) : 0)}</span>
              <span className="per">{t("miesięcznie", "a month")}</span>
            </p>
            <p className="plan-month">
              {t("albo", "or")} <strong>{m(x.yearly, cur ? proPriceF(x.id, 12, cur) : 0)}</strong> {t("za rok z góry", cur ? "a year – 2 months free" : "paid yearly in advance")}
            </p>
            <ul className="plan-facts">
              <li>
                <strong>{x.gb >= 1000 ? `${x.gb / 1000} TB` : `${x.gb} GB`}</strong> {t("na wszystkie galerie i filmy", "for all galleries and videos")}
              </li>
              <li>
                {t("Filmy w galerii bez dopłat – do", "Videos at no extra cost – up to")} <strong>{x.videoHours} h</strong>
              </li>
              {included.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
            <Link href="/rejestracja" className={x.featured ? "btn btn-wide" : "btn btn-ghost btn-wide"}>
              {t("Załóż konto", "Sign up")}
            </Link>
          </article>
  );

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
        {PHOTO_TIERS.map(card)}
      </div>

      <div className="pro-film">
        <h3>{t("Dla filmowców", "For filmmakers")}</h3>
        <p>
          {t(
            "Więcej godzin filmów w pełnej jakości do pobrania i z podglądem do oglądania na każdym urządzeniu. Wszystkie dodatki Pro w cenie.",
            "More hours of full-quality films to download, with a preview that plays on any device. All Pro add-ons included.",
          )}
        </p>
        <div className="pro-cards pro-cards-2">{FILM_TIERS.map(card)}</div>
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
                {PHOTO_TIERS.map((x) => (
                  <th key={x.id} scope="col">
                    {proName(x)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">{cur ? `Large galleries at ${fmtCur(galleryPriceF("duza", 12, cur), cur)}` : t(`Duże galerie po ${COMPARE_GALLERY_PRICE} zł`, `Large galleries at PLN ${COMPARE_GALLERY_PRICE}`)}</th>
                {PHOTO_TIERS.map((x) => {
                  const c = compareFor(x);
                  return (
                    <td key={x.id}>
                      {c.galleries} × = {m(c.galleryCost, fCompare(x).galleryCost)}
                    </td>
                  );
                })}
              </tr>
              {COMPARE_ADDONS.map((a, i) => (
                <tr key={a.pl}>
                  <th scope="row">{lang === "en" ? a.en : a.pl}</th>
                  {PHOTO_TIERS.map((x) => (
                    <td key={x.id}>{m(a.price, fAddons[i] ?? 0)}</td>
                  ))}
                </tr>
              ))}
              <tr className="pro-row-sum">
                <th scope="row">{t("Razem osobno", "Total separately")}</th>
                {PHOTO_TIERS.map((x) => (
                  <td key={x.id}>{m(compareFor(x).separately, fCompare(x).separately)}</td>
                ))}
              </tr>
              <tr className="pro-row-pro">
                <th scope="row">{t("Abonament Pro na rok", "Pro subscription per year")}</th>
                {PHOTO_TIERS.map((x) => (
                  <td key={x.id}>{m(x.yearly, fCompare(x).yearly)}</td>
                ))}
              </tr>
              <tr className="pro-row-save">
                <th scope="row">{t("Oszczędzasz", "You save")}</th>
                {PHOTO_TIERS.map((x) => (
                  <td key={x.id}>{m(compareFor(x).saving, fCompare(x).saving)}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="hint-inline">
          {t(
            "Filmy w galeriach Pro są w cenie do limitu godzin pakietu i liczą się do miejsca. Abonament nie odnawia się sam; po jego końcu galerie działają jeszcze 30 dni. Wydruk albumów zamawiasz osobno.",
            "Videos in Pro galleries are included up to the plan's hour limit and count towards storage. The subscription doesn't renew automatically; after it ends galleries keep working for 30 days. Printed albums are ordered separately.",
          )}
        </p>
      </div>
    </section>
  );
}
