import Link from "next/link";
import SideLogout from "@/components/SideLogout";
import { getUser } from "@/lib/supabase/server";
import { getLang } from "@/lib/lang-server";
import { tr, locale } from "@/lib/lang";
import { getBilling } from "@/lib/billing";
import { getWallet } from "@/lib/wallet";
import { getOrder } from "@/lib/p24";
import { formatBytes } from "@/lib/plans";
import { getProSub, proActive, proInGrace, proGraceEnd, proTier, proName, proBytes, proUsage, proUpgradeCost, PRO_TIERS, type ProTierId } from "@/lib/pro";
import RefreshSoon from "../galeria/[id]/RefreshSoon";
import ProBuy from "./ProBuy";

export const dynamic = "force-dynamic";

// Abonament Pro: stan, miejsce na galerie, zakup, przedłużenie i zmiana pakietu
export default async function ProPage({ searchParams }: { searchParams: Promise<{ platnosc?: string }> }) {
  const { platnosc } = await searchParams;
  const { user } = await getUser();
  const lang = await getLang();
  const t = (pl: string, en: string) => tr(lang, pl, en);
  const fmt = new Intl.DateTimeFormat(locale(lang), { day: "numeric", month: "long", year: "numeric" });
  const [sub, billing, wallet, usage, order] = await Promise.all([
    getProSub(user!.id),
    getBilling(user!.id),
    getWallet(user!.id),
    proUsage(user!.id).catch(() => ({ bytes: 0, galleries: 0 })),
    platnosc ? getOrder(platnosc).catch(() => null) : Promise.resolve(null),
  ]);
  const active = proActive(sub);
  const grace = proInGrace(sub);
  const tier = sub ? proTier(sub.tier) : undefined;
  const share = tier ? Math.min(1, usage.bytes / proBytes(tier)) : 0;
  const order_ = PRO_TIERS.map((x) => x.id);
  const upgrade: Partial<Record<ProTierId, number>> = {};
  if (active && tier) for (const x of PRO_TIERS) if (order_.indexOf(x.id) > order_.indexOf(tier.id)) upgrade[x.id] = proUpgradeCost(tier, x, sub!.paidUntil, sub!.months === 12 ? 12 : 1);

  const included = [
    t("Galerie bez opłat za publikację – ile chcesz, w ramach miejsca", "Publish as many galleries as you like within your storage"),
    t("Galerie nie wygasają, dopóki trwa abonament", "Galleries don't expire while the subscription lasts"),
    t("Filmy w galerii bez dopłat (liczą się do miejsca)", "Videos in galleries at no extra cost (count towards storage)"),
    t("Wszystkie motywy galerii", "All gallery themes"),
    t("Moja strona – portfolio z formularzem i rezerwacjami", "My website – portfolio with contact form and bookings"),
    t("Własna domena galerii", "Custom gallery domain"),
    t("Znajdź siebie na zdjęciach – w każdej galerii", "Find me in the photos – in every gallery"),
    t("Projektor albumów – bez limitu albumów", "Album designer – unlimited albums"),
    t("Zdjęcia od gości (kody QR)", "Guest uploads (QR codes)"),
    t("Wtyczka do Lightrooma", "Lightroom plug-in"),
  ];

  return (
    <div className="app-body">
      <aside className="app-side">
        <Link href="/panel" className="link-quiet back-link">← {t("Galerie", "Galleries")}</Link>
        <nav aria-label="Lenslie Pro">
          <span className="side-link active">Lenslie Pro</span>
        </nav>
        <SideLogout />
      </aside>
      <main className="app-main pro-page">
        {order && order.ownerId === user!.id && order.status !== "paid" && (
          <p className="warn-inline pay-note">
            {t("Czekamy na potwierdzenie płatności od Przelewy24. Strona odświeży się sama.", "Waiting for payment confirmation from Przelewy24. The page refreshes by itself.")}
            <RefreshSoon />
          </p>
        )}

        <section className="pro-head">
          <p className="fs-kicker">{t("Pakiety Pro dla firm", "Pro plans for businesses")}</p>
          <h1>{active && tier ? proName(tier) : t("Jeden abonament – wszystkie galerie i dodatki", "One subscription – all galleries and add-ons")}</h1>
          {active && tier ? (
            <p>
              {t("Abonament opłacony do", "Paid until")} <strong>{fmt.format(new Date(sub!.paidUntil))}</strong>.{" "}
              {t("Galerie w abonamencie:", "Galleries in the subscription:")} {usage.galleries}.
            </p>
          ) : grace && tier ? (
            <p className="warn-inline">
              {t(
                `Abonament ${proName(tier)} skończył się ${fmt.format(new Date(sub!.paidUntil))}. Galerie działają do ${fmt.format(proGraceEnd(sub!))} – odnów abonament, aby je zachować i dodawać zdjęcia.`,
                `Your ${proName(tier)} subscription ended on ${fmt.format(new Date(sub!.paidUntil))}. Galleries work until ${fmt.format(proGraceEnd(sub!))} – renew to keep them and add photos.`,
              )}
            </p>
          ) : (
            <p>
              {t(
                "Zamiast płacić za każdą galerię osobno – stała miesięczna albo roczna opłata za miejsce na wszystkie galerie i filmy. Wszystkie płatne dodatki w cenie.",
                "Instead of paying per gallery – one monthly or yearly fee for storage for all your galleries and videos. All paid add-ons included.",
              )}
            </p>
          )}
        </section>

        {tier && (active || grace) && (
          <section className="settings-card">
            <h2>{t("Miejsce na galerie", "Storage")}</h2>
            <div className={share >= 1 ? "usage full" : share > 0.85 ? "usage warn" : "usage"}>
              <div className="usage-bar">
                <span style={{ width: `${Math.max(2, share * 100)}%` }} />
              </div>
              <p>
                {formatBytes(usage.bytes)} {t("z", "of")} {formatBytes(proBytes(tier))} · {t("zdjęcia, filmy i wersje robocze galerii", "photos, videos and draft galleries")}
              </p>
            </div>
          </section>
        )}

        <div className="pro-grid">
          <section className="settings-card">
            <h2>{active ? t("Przedłuż albo zmień pakiet", "Extend or upgrade") : grace ? t("Odnów abonament", "Renew") : t("Wybierz pakiet", "Choose a plan")}</h2>
            <ProBuy current={sub?.tier ?? null} active={active} usedBytes={usage.bytes} upgrade={upgrade} balance={wallet.balance} billing={billing} />
            <p className="hint-inline">
              {t(
                "Abonament nie odnawia się sam – przypomnimy mailem 7 dni przed końcem. Po końcu galerie działają jeszcze 30 dni.",
                "The subscription doesn't renew automatically – we'll email you 7 days before it ends. After it ends, galleries keep working for 30 days.",
              )}{" "}
              <Link href="/cennik#pro">{t("Porównanie z cenami za galerię ›", "Compare with per-gallery prices ›")}</Link>
            </p>
          </section>
          <section className="settings-card">
            <h2>{t("W cenie abonamentu", "Included")}</h2>
            <ul className="pro-incl">
              {included.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <p className="hint-inline">
              {t(
                "Wydruk albumów zamawiasz osobno. Galerie opłacone wcześniej działają do swojej daty – możesz je przenieść do abonamentu na stronie galerii.",
                "Printed albums are ordered separately. Galleries paid earlier keep their own dates – you can move them into the subscription from the gallery page.",
              )}
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
