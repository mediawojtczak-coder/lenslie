import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import { getGallerySummary } from "@/lib/photos";
import { getMeta } from "@/lib/galleries";

export const dynamic = "force-dynamic";

type GalleryRow = { id: string; title: string; created_at: string };

type Card = GalleryRow & { count: number; coverUrl: string | null; protected: boolean };

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
      const [summary, meta] = await Promise.all([
        getGallerySummary(g.id).catch(() => ({ count: 0, coverUrl: null })),
        getMeta(g.id).catch(() => null),
      ]);
      return { ...g, ...summary, protected: Boolean(meta?.passwordHash) };
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
        <Link href="/panel/nowa" className="btn btn-wide">Nowa galeria</Link>
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
            <Link href="/panel/nowa" className="btn">Utwórz pierwszą galerię</Link>
          </div>
        ) : visible.length === 0 ? (
          <p className="notice-left">Brak galerii pasujących do wybranych filtrów.</p>
        ) : (
          <ul className="card-grid">
            {visible.map((c) => (
              <li key={c.id} className="g-card">
                <Link href={`/galeria/${c.id}`} className="g-cover" target="_blank">
                  {c.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.coverUrl} alt="" loading="lazy" />
                  ) : (
                    <span className="g-cover-empty">Brak zdjęć</span>
                  )}
                  {c.protected && <span className="g-badge">Hasło</span>}
                </Link>
                <div className="g-info">
                  <Link href={`/galeria/${c.id}`} className="g-title" target="_blank">
                    {c.title}
                  </Link>
                  <p className="g-meta">
                    {photosLabel(c.count)} · {dateFmt.format(new Date(c.created_at))}
                  </p>
                  <Link href={`/panel/nowa?galeria=${c.id}`} className="g-action">
                    Dodaj zdjęcia
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
