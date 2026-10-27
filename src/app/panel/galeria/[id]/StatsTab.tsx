import { getUser } from "@/lib/supabase/server";

type Ev = { kind: string; photo: string | null; created_at: string };

const dayFmt = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "short", timeZone: "Europe/Warsaw" });
const timeFmt = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Warsaw" });

const LABELS: Record<string, string> = {
  view: "Klient otworzył galerię",
  guest_view: "Gość otworzył galerię",
  download: "Pobrano zdjęcie",
  zip: "Pobrano ZIP",
  slideshow: "Pokaz slajdów",
};

const dayKey = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "Europe/Warsaw" });

// Statystyki galerii: otwarcia, pobrania i ostatnia aktywność
export default async function StatsTab({ id }: { id: string }) {
  const { supabase } = await getUser();
  const since = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();
  const { data, error } = await supabase
    .from("gallery_events")
    .select("kind, photo, created_at")
    .eq("gallery_id", id)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) {
    return (
      <p className="warn-inline">
        Statystyki nie są jeszcze włączone: w Supabase trzeba uruchomić SQL z tabelą „gallery_events” i dodać klucz
        SUPABASE_SECRET_KEY w Vercelu.
      </p>
    );
  }

  const events = (data ?? []) as Ev[];
  const count = (k: string) => events.filter((e) => e.kind === k).length;
  const lastView = events.find((e) => e.kind === "view" || e.kind === "guest_view");

  // Otwarcia z ostatnich 30 dni, dzień po dniu
  const days: { key: string; label: string; n: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 3600 * 1000);
    days.push({ key: dayKey(d), label: dayFmt.format(d), n: 0 });
  }
  const index = new Map(days.map((d, i) => [d.key, i]));
  for (const e of events) {
    if (e.kind !== "view" && e.kind !== "guest_view") continue;
    const i = index.get(dayKey(new Date(e.created_at)));
    if (i !== undefined) days[i].n++;
  }
  const max = Math.max(1, ...days.map((d) => d.n));

  // Najczęściej pobierane zdjęcia
  const top = new Map<string, number>();
  for (const e of events) if (e.kind === "download" && e.photo) top.set(e.photo, (top.get(e.photo) ?? 0) + 1);
  const topList = [...top.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const tiles = [
    { label: "Otwarcia przez klienta", value: count("view") },
    { label: "Otwarcia przez gości", value: count("guest_view") },
    { label: "Pobrane zdjęcia", value: count("download") },
    { label: "Pobrane ZIP-y", value: count("zip") },
  ];

  return (
    <div className="stats">
      <div className="stat-tiles">
        {tiles.map((t) => (
          <div key={t.label} className="stat-tile">
            <p className="stat-value">{t.value}</p>
            <p className="stat-label">{t.label}</p>
          </div>
        ))}
      </div>
      <p className="hint-inline">
        Ostatnie 90 dni.{" "}
        {lastView ? `Ostatnie otwarcie: ${timeFmt.format(new Date(lastView.created_at))}.` : "Galeria nie była jeszcze otwierana."}
      </p>

      <div className="settings-card">
        <h2>Otwarcia w ostatnich 30 dniach</h2>
        <div className="day-chart" role="img" aria-label="Liczba otwarć galerii dzień po dniu">
          {days.map((d) => (
            <div key={d.key} className="day-bar" title={`${d.label}: ${d.n}`}>
              <span style={{ height: `${(d.n / max) * 100}%` }} />
            </div>
          ))}
        </div>
        <div className="day-axis">
          <span>{days[0].label}</span>
          <span>{days[days.length - 1].label}</span>
        </div>
      </div>

      <div className="stats-cols">
        <div className="settings-card">
          <h2>Najczęściej pobierane</h2>
          {topList.length === 0 ? (
            <p className="hint-inline">Nikt jeszcze nie pobrał pojedynczego zdjęcia.</p>
          ) : (
            <ol className="stat-list">
              {topList.map(([name, n]) => (
                <li key={name}>
                  <span>{name}</span>
                  <strong>{n}</strong>
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="settings-card">
          <h2>Ostatnia aktywność</h2>
          {events.length === 0 ? (
            <p className="hint-inline">Brak aktywności.</p>
          ) : (
            <ul className="stat-list">
              {events.slice(0, 12).map((e, i) => (
                <li key={i}>
                  <span>
                    {LABELS[e.kind] ?? e.kind}
                    {e.photo && <small> · {e.photo}</small>}
                  </span>
                  <time>{timeFmt.format(new Date(e.created_at))}</time>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
