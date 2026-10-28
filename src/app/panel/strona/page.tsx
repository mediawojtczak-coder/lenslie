import Link from "next/link";
import SideLogout from "@/components/SideLogout";
import { getUser } from "@/lib/supabase/server";
import { getLang } from "@/lib/lang-server";
import { tr } from "@/lib/lang";
import { siteUrl } from "@/lib/email";
import { getBilling } from "@/lib/billing";
import { getWallet } from "@/lib/wallet";
import { getOrder } from "@/lib/p24";
import { getSite, emptySite, photoUrls, portfolioActive, PORTFOLIO_PRICES } from "@/lib/portfolio";
import RefreshSoon from "../galeria/[id]/RefreshSoon";
import PortfolioEditor from "./PortfolioEditor";
import { Great_Vibes } from "next/font/google";
import { getUserBrand } from "@/lib/profiles";
import { listUserEvents, listReservations, slotPast } from "@/lib/bookings";

const script = Great_Vibes({ weight: "400", subsets: ["latin", "latin-ext"], variable: "--font-script", display: "swap" });

export const dynamic = "force-dynamic";

// Moja strona: mini-strona portfolio fotografa
export default async function Strona({ searchParams }: { searchParams: Promise<{ platnosc?: string }> }) {
  const { platnosc } = await searchParams;
  const { supabase, user } = await getUser();
  const lang = await getLang();
  const t = (pl: string, en: string) => tr(lang, pl, en);
  const { data: prof } = await supabase.from("profiles").select("studio_name").eq("id", user!.id).maybeSingle();
  const site = (await getSite(user!.id)) ?? emptySite(user!.id, (prof?.studio_name as string) ?? "", lang);
  const [photos, billing, wallet, order] = await Promise.all([
    photoUrls(site).catch(() => []),
    getBilling(user!.id),
    getWallet(user!.id),
    platnosc ? getOrder(platnosc) : Promise.resolve(null),
  ]);
  const active = portfolioActive(site);
  const brand = await getUserBrand(user!.id).catch(() => null);
  const events = (
    await Promise.all(
      (await listUserEvents(user!.id).catch(() => []))
        .filter((e) => e.open)
        .map(async (e) => {
          const res = await listReservations(e.id).catch(() => new Map());
          return { id: e.id, title: e.title, price: e.price, free: e.slots.filter((x) => !slotPast(x) && !res.has(x.id)).length };
        }),
    )
  ).filter((e) => e.free > 0);

  return (
    <div className="app-body">
      <aside className="app-side">
        <Link href="/panel" className="link-quiet back-link">← {t("Galerie", "Galleries")}</Link>
        <nav aria-label={t("Moja strona", "My website")}>
          <span className="side-link active">{t("Moja strona", "My website")}</span>
        </nav>
        <SideLogout />
      </aside>
      <main className={`app-main ${script.variable}`}>
        {order && order.ownerId === user!.id && order.status !== "paid" && !active && (
          <p className="warn-inline pay-note">
            {t("Czekamy na potwierdzenie płatności od Przelewy24. Strona odświeży się sama.", "Waiting for payment confirmation from Przelewy24. The page refreshes by itself.")}
            <RefreshSoon />
          </p>
        )}
        <PortfolioEditor
          site={{
            slug: site.slug,
            title: site.title,
            tagline: site.tagline,
            about: site.about,
            city: site.city,
            phone: site.phone,
            instagram: site.instagram,
            facebook: site.facebook,
            services: site.services,
            showBookings: site.showBookings,
            dark: site.dark,
            lang: site.lang,
            consent: Boolean(site.consentAt),
          }}
          photos={photos}
          active={active}
          paidUntil={site.paidUntil ?? null}
          base={`${siteUrl()}/p/`}
          logo={brand?.logoUrl ?? null}
          events={events}
          prices={PORTFOLIO_PRICES}
          balance={wallet.balance}
          billing={billing}
        />
      </main>
    </div>
  );
}
