import { getUser } from "@/lib/supabase/server";
import { getLang } from "@/lib/lang-server";
import { tr, locale } from "@/lib/lang";


type Ev = { kind: string; photo: string | null; created_at: string };


const dayKey = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "Europe/Warsaw" });

// Statystyki galerii: otwarcia, pobrania i ostatnia aktywność
export default async function StatsTab({ id }: { id: string }) {
  const { supabase } = await getUser();
  const lang = await getLang();
  const t = (pl: string, en: string) => tr(lang, pl, en);
  const dayFmt = new Intl.DateTimeFormat(locale(lang), { day: "numeric", month: "short", timeZone: "Europe/Warsaw" });
  const timeFmt = new Intl.DateTimeFormat(locale(lang), { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Warsaw" });
  const LABELS: Record<string, string> = {
    view: t("Klient otworzył galerię", "Client opened the gallery"),
    guest_view: t("Gość otworzył galerię", "A guest opened the gallery"),
    download: t("Pobrano zdjęcie", "Photo downloaded"),
    zip: t("Pobrano ZIP", "ZIP downloaded"),
    slideshow: t("Pokaz slajdów", "Slideshow"),
  };
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
        {t("Statystyki nie są jeszcze włączone.", "Statistics are not enabled yet.")}
        <br />
        <small>
          {t("Szczegóły", "Details")}: {error.code ?? ""} {error.message}
        </small>
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
    { label: t("Otwarcia przez klienta", "Opens by client"), value: count("view") },
    { label: t("Otwarcia przez gości", "Opens by guests"), value: count("guest_view") },
    { label: t("Pobrane zdjęcia", "Photos downloaded"), value: count("download") },
    { label: t("Pobrane ZIP-y", "ZIPs downloaded"), value: count("zip") },
  ];

  return (
    <div className="stats">
      <div className="stat-tiles">
        {tiles.map((x) => (
          <div key={x.label} className="stat-tile">
            <p className="stat-value">{x.value}</p>
            <p className="stat-label">{x.label}</p>
          </div>
        ))}
      </div>
      <p className="hint-inline">
        {t("Ostatnie 90 dni.", "Last 90 days.")}{" "}
        {lastView ? `${t("Ostatnie otwarcie", "Last opened")}: ${timeFmt.format(new Date(lastView.created_at))}.` : t("Galeria nie była jeszcze otwierana.", "The gallery has not been opened yet.")}
      </p>

      <div className="settings-card">
        <h2>{t("Otwarcia w ostatnich 30 dniach", "Opens in the last 30 days")}</h2>
        <div className="day-chart" role="img" aria-label={t("Liczba otwarć galerii dzień po dniu", "Gallery opens day by day")}>
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
          <h2>{t("Najczęściej pobierane", "Most downloaded")}</h2>
          {topList.length === 0 ? (
            <p className="hint-inline">{t("Nikt jeszcze nie pobrał pojedynczego zdjęcia.", "No single photo has been downloaded yet.")}</p>
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
          <h2>{t("Ostatnia aktywność", "Recent activity")}</h2>
          {events.length === 0 ? (
            <p className="hint-inline">{t("Brak aktywności.", "No activity.")}</p>
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
