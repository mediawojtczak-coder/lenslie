import Link from "next/link";
import SideLogout from "@/components/SideLogout";
import { getUser } from "@/lib/supabase/server";
import { getGallerySummary } from "@/lib/photos";
import { getMeta, isExpired } from "@/lib/galleries";
import { getPlan } from "@/lib/plans";
import CreateGallery from "./CreateGallery";
import { getLang } from "@/lib/lang-server";
import { tr, locale } from "@/lib/lang";
import { planName } from "@/lib/plans";

export const dynamic = "force-dynamic";

type GalleryRow = { id: string; title: string; created_at: string };

type Card = GalleryRow & {
  count: number;
  coverUrl: string | null;
  protected: boolean;
  planName: string | null;
  expiresAt: string | null;
  expired: boolean;
  views: number | null;
};



function photosLabelPl(n: number) {
  if (n === 1) return "1 zdjęcie";
  const lastTwo = n % 100;
  const last = n % 10;
  if (last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) return `${n} zdjęcia`;
  return `${n} zdjęć`;
}

export default async function Panel({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filtr?: string }>;
}) {
  const { q = "", filtr = "" } = await searchParams;
  const lang = await getLang();
  const t = (pl: string, en: string) => tr(lang, pl, en);
  const dateFmt = new Intl.DateTimeFormat(locale(lang), { day: "numeric", month: "long", year: "numeric" });
  const viewsLabel = (n: number) => {
    if (lang === "en") return n === 1 ? "1 view" : `${n} views`;
    if (n === 1) return "1 wyświetlenie";
    const l = n % 10, l2 = n % 100;
    return `${n} ${l >= 2 && l <= 4 && !(l2 >= 12 && l2 <= 14) ? "wyświetlenia" : "wyświetleń"}`;
  };
  const photosLabel = (n: number) => (lang === "en" ? (n === 1 ? "1 photo" : `${n} photos`) : photosLabelPl(n));
  const FILTERS = [
    { key: "", label: t("Wszystkie", "All") },
    { key: "haslo", label: t("Z hasłem", "Password protected") },
    { key: "otwarte", label: t("Otwarte", "Open") },
    { key: "puste", label: t("Bez zdjęć", "Empty") },
  ] as const;
  const { supabase } = await getUser();

  const { data } = await supabase
    .from("galleries")
    .select("id, title, created_at")
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as GalleryRow[];

  const cards: Card[] = await Promise.all(
    rows.map(async (g) => {
      const meta = await getMeta(g.id).catch(() => null);
      const summary = await getGallerySummary(g.id, meta?.cover).catch(() => ({ count: 0, coverUrl: null }));
      // Liczba otwarć galerii (klient i goście)
      const { count: views, error: viewsErr } = await supabase
        .from("gallery_events")
        .select("kind", { count: "exact", head: true })
        .eq("gallery_id", g.id)
        .in("kind", ["view", "guest_view"]);
      return {
        ...g,
        ...summary,
        protected: Boolean(meta?.passwordHash),
        planName: (() => { const p = getPlan(meta?.plan); return p ? planName(p, lang) : null; })(),
        expiresAt: meta?.expiresAt ?? null,
        expired: isExpired(meta),
        views: viewsErr ? null : (views ?? 0),
      };
    }),
  );

  const counts: Record<string, number> = {
    "": cards.length,
    haslo: cards.filter((c) => c.protected).length,
    otwarte: cards.filter((c) => !c.protected).length,
    puste: cards.filter((c) => c.count === 0).length,
  };

  const query = q.trim().toLowerCase();
  const visible = cards.filter((c) => {
    if (filtr === "haslo" && !c.protected) return false;
    if (filtr === "otwarte" && c.protected) return false;
    if (filtr === "puste" && c.count > 0) return false;
    if (query && !c.title.toLowerCase().includes(query) && !c.id.includes(query)) return false;
    return true;
  });

  const linkFor = (key: string) => {
    const p = new URLSearchParams();
    if (key) p.set("filtr", key);
    if (q) p.set("q", q);
    const s = p.toString();
    return s ? `/panel?${s}` : "/panel";
  };

  return (
    <div className="app-body">
      <aside className="app-side">
        <CreateGallery label={t("Nowa galeria", "New gallery")} className="btn btn-wide" />
        <nav aria-label={t("Filtry galerii", "Gallery filters")}>
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={linkFor(f.key)}
              className={filtr === f.key ? "side-link active" : "side-link"}
              aria-current={filtr === f.key ? "page" : undefined}
            >
              <span>{f.label}</span>
              <span className="side-count">{counts[f.key]}</span>
            </Link>
          ))}
        </nav>
        <nav aria-label={t("Narzędzia", "Tools")} className="side-tools">
          <Link href="/panel/strona" className="side-link">
            <span>{t("Moja strona", "My website")}</span>
          </Link>
          <Link href="/panel/znajdz-siebie" className="side-link">
            <span>{t("Znajdź siebie", "Find me")}</span>
          </Link>
          <Link href="/panel/goscie" className="side-link">
            <span>{t("Zdjęcia od gości", "Guest uploads")}</span>
          </Link>
          <Link href="/panel/rezerwacje" className="side-link">
            <span>{t("Rezerwacje sesji", "Session bookings")}</span>
          </Link>
          <Link href="/panel/goscie/oferta" className="side-link">
            <span>{t("Kody QR na stoły", "QR codes for tables")}</span>
            <span className="side-count">99 zł</span>
          </Link>
        </nav>
        <SideLogout />
      </aside>

      <main className="app-main">
        {query && (
          <div className="app-head">
            <p className="search-note">{t("Wyniki dla", "Results for")} „{q.trim()}”</p>
            <Link href={linkFor(filtr)} className="link-quiet">{t("Wyczyść wyszukiwanie", "Clear search")}</Link>
          </div>
        )}

        {cards.length === 0 ? (
          <div className="empty-state">
            <p>{t("Nie masz jeszcze żadnej galerii.", "You don’t have any galleries yet.")}</p>
            <CreateGallery label={t("Utwórz pierwszą galerię", "Create your first gallery")} className="btn" />
          </div>
        ) : visible.length === 0 ? (
          <p className="notice-left">{t("Brak galerii pasujących do wybranych filtrów.", "No galleries match the selected filters.")}</p>
        ) : (
          <ul className="card-grid">
            {visible.map((c) => (
              <li key={c.id} className="g-card">
                <Link href={`/panel/galeria/${c.id}`} className="g-cover">
                  {c.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.coverUrl} alt="" loading="lazy" />
                  ) : (
                    <span className="g-cover-empty">{t("Brak zdjęć", "No photos")}</span>
                  )}
                  {!c.planName ? (
                    <span className="g-badge g-badge-draft">{t("Wersja robocza", "Draft")}</span>
                  ) : c.expired ? (
                    <span className="g-badge g-badge-exp">{t("Wygasła", "Expired")}</span>
                  ) : (
                    c.protected && <span className="g-badge">{t("Hasło", "Password")}</span>
                  )}
                </Link>
                <div className="g-info">
                  <Link href={`/panel/galeria/${c.id}`} className="g-title">
                    {c.title}
                  </Link>
                  <p className="g-meta">
                    {photosLabel(c.count)}
                    {c.planName ? ` · ${c.planName}` : ` · ${t("nieopublikowana", "unpublished")}`}
                    <br />
                    {c.planName && c.expiresAt
                      ? `${c.expired ? t("Wygasła", "Expired") : t("Dostęp do", "Available until")} ${dateFmt.format(new Date(c.expiresAt))}`
                      : `${t("Utworzona", "Created")} ${dateFmt.format(new Date(c.created_at))}`}
                  </p>
                  <div className="g-foot">
                    <a href={`/galeria/${c.id}`} className="g-action" target="_blank" rel="noreferrer">
                      {t("Podgląd dla klienta", "Client preview")}
                    </a>
                    {c.views !== null && (
                      <Link href={`/panel/galeria/${c.id}?tab=statystyki`} className="g-views" title={t("Wyświetlenia galerii", "Gallery views")}>
                        <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
                          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" fill="none" stroke="currentColor" strokeWidth="1.6" />
                          <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
                        </svg>
                        {viewsLabel(c.views)}
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
