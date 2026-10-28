import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Great_Vibes } from "next/font/google";
import { getSiteBySlug, photoUrls, portfolioActive } from "@/lib/portfolio";
import { getUserBrand } from "@/lib/profiles";
import { getUser } from "@/lib/supabase/server";
import { listUserEvents, listReservations, slotPast } from "@/lib/bookings";
import PortfolioView from "@/components/PortfolioView";
import PortfolioContact from "@/components/PortfolioContact";

export const dynamic = "force-dynamic";

const script = Great_Vibes({ weight: "400", subsets: ["latin", "latin-ext"], variable: "--font-script", display: "swap" });

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const s = await getSiteBySlug(slug);
  return s ? { title: s.title || "Lenslie", description: s.tagline || undefined } : {};
}

// Publiczna mini-strona portfolio fotografa
export default async function Portfolio({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = await getSiteBySlug(slug);
  if (!s) notFound();
  const { user } = await getUser().catch(() => ({ user: null }));
  const owner = user?.id === s.uid;
  const active = portfolioActive(s);
  const t = (pl: string, en: string) => (s.lang === "en" ? en : pl);
  if (!active && !owner) {
    return (
      <main className="pf pf-off">
        <h1>{s.title}</h1>
        <p>{t("Strona jest chwilowo niedostępna.", "This page is temporarily unavailable.")}</p>
      </main>
    );
  }
  const [photos, brand, events] = await Promise.all([
    s.consentAt ? photoUrls(s).catch(() => []) : Promise.resolve([]),
    getUserBrand(s.uid).catch(() => null),
    s.showBookings ? listUserEvents(s.uid).catch(() => []) : Promise.resolve([]),
  ]);
  const openEvents = (
    await Promise.all(
      events
        .filter((e) => e.open)
        .map(async (e) => {
          const res = await listReservations(e.id).catch(() => new Map());
          return { id: e.id, title: e.title, price: e.price, free: e.slots.filter((x) => !slotPast(x) && !res.has(x.id)).length };
        }),
    )
  ).filter((e) => e.free > 0);

  return (
    <main className={`pf ${script.variable}`}>
      {owner && !active && (
        <p className="preview-banner">
          {t("Podgląd – strona nie jest jeszcze włączona.", "Preview – the website is not active yet.")} <a href="/panel/strona">{t("Wróć do panelu", "Back to dashboard")}</a>
        </p>
      )}
      {owner && !s.consentAt && (
        <p className="preview-banner">{t("Zdjęcia są ukryte, dopóki nie potwierdzisz zgód osób na zdjęciach.", "Photos are hidden until you confirm consent from the people in them.")}</p>
      )}
      <PortfolioView
        d={{
          title: s.title,
          tagline: s.tagline,
          about: s.about,
          city: s.city,
          phone: s.phone,
          instagram: s.instagram,
          facebook: s.facebook,
          services: s.services,
          photos: photos.map((p) => p.url),
          events: openEvents,
          dark: s.dark,
          lang: s.lang,
          logo: brand?.logoUrl ?? null,
        }}
        contact={<PortfolioContact slug={s.slug} lang={s.lang} />}
      />
    </main>
  );
}
