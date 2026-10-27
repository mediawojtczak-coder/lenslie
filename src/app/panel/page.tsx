import Link from "next/link";
import SideLogout from "@/components/SideLogout";
import { getUser } from "@/lib/supabase/server";
import { getGallerySummary } from "@/lib/photos";
import { getMeta, isExpired } from "@/lib/galleries";
import { getPlan } from "@/lib/plans";
import CreateGallery from "./CreateGallery";

export const dynamic = "force-dynamic";

type GalleryRow = { id: string; title: string; created_at: string };

type Card = GalleryRow & {
  count: number;
  coverUrl: string | null;
  protected: boolean;
  planName: string | null;
  expiresAt: string | null;
  expired: boolean;
};

const dateFmt = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric" });

const FILTERS = [
  { key: "", label: "Wszystkie" },
  { key: "haslo", label: "Z hasłem" },
  { key: "otwarte", label: "Otwarte" },
  { key: "puste", label: "Bez zdjęć" },
] as const;

function photosLabel(n: number) {
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
      return {
        ...g,
        ...summary,
        protected: Boolean(meta?.passwordHash),
        planName: getPlan(meta?.plan)?.name ?? null,
        expiresAt: meta?.expiresAt ?? null,
        expired: isExpired(meta),
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
        <CreateGallery label="Nowa galeria" className="btn btn-wide" />
        <nav aria-label="Filtry galerii">
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
        <SideLogout />
      </aside>

      <main className="app-main">
        {query && (
          <div className="app-head">
            <p className="search-note">Wyniki dla „{q.trim()}”</p>
            <Link href={linkFor(filtr)} className="link-quiet">Wyczyść wyszukiwanie</Link>
          </div>
        )}

        {cards.length === 0 ? (
          <div className="empty-state">
            <p>Nie masz jeszcze żadnej galerii.</p>
            <CreateGallery label="Utwórz pierwszą galerię" className="btn" />
          </div>
        ) : visible.length === 0 ? (
          <p className="notice-left">Brak galerii pasujących do wybranych filtrów.</p>
        ) : (
          <ul className="card-grid">
            {visible.map((c) => (
              <li key={c.id} className="g-card">
                <Link href={`/panel/galeria/${c.id}`} className="g-cover">
                  {c.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.coverUrl} alt="" loading="lazy" />
                  ) : (
                    <span className="g-cover-empty">Brak zdjęć</span>
                  )}
                  {c.expired ? (
                    <span className="g-badge g-badge-exp">Wygasła</span>
                  ) : (
                    c.protected && <span className="g-badge">Hasło</span>
                  )}
                </Link>
                <div className="g-info">
                  <Link href={`/panel/galeria/${c.id}`} className="g-title">
                    {c.title}
                  </Link>
                  <p className="g-meta">
                    {photosLabel(c.count)}
                    {c.planName ? ` · ${c.planName}` : " · bez pakietu"}
                    <br />
                    {c.expiresAt
                      ? `${c.expired ? "Wygasła" : "Dostęp do"} ${dateFmt.format(new Date(c.expiresAt))}`
                      : `Utworzona ${dateFmt.format(new Date(c.created_at))}`}
                  </p>
                  <a href={`/galeria/${c.id}`} className="g-action" target="_blank" rel="noreferrer">
                    Podgląd dla klienta
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
