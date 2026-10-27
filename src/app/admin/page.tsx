import { adminClient } from "@/lib/supabase/admin";
import { listObjects } from "@/lib/photos";
import { getMeta, isExpired, type GalleryMeta } from "@/lib/galleries";
import { getPlan, formatBytes } from "@/lib/plans";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Warsaw" });
const fmtDate = (d?: string | null) => (d ? dateFmt.format(new Date(d)) : "–");
const GB = 1024 ** 3;

type G = { id: string; title: string; owner_id: string | null; created_at: string };

export default async function Admin() {
  const db = adminClient();
  if (!db) {
    return (
      <main className="app-main admin">
        <p className="warn-inline">Dodaj w Vercelu zmienną SUPABASE_SECRET_KEY, aby zobaczyć dane.</p>
      </main>
    );
  }

  const [usersRes, galleriesRes, profilesRes, objects] = await Promise.all([
    db.auth.admin.listUsers({ perPage: 1000 }),
    db.from("galleries").select("id, title, owner_id, created_at").order("created_at", { ascending: false }),
    db.from("profiles").select("id, studio_name"),
    listObjects("galleries/").catch(() => []),
  ]);

  const users = usersRes.data?.users ?? [];
  const galleries = (galleriesRes.data ?? []) as G[];
  const studios = new Map(((profilesRes.data ?? []) as { id: string; studio_name: string | null }[]).map((p) => [p.id, p.studio_name]));
  const emails = new Map(users.map((u) => [u.id, u.email ?? ""]));

  // Zajęte miejsce każdej galerii w jednym przejściu po magazynie
  const usage = new Map<string, number>();
  for (const o of objects) {
    const gid = o.key.split("/")[1];
    usage.set(gid, (usage.get(gid) ?? 0) + o.size);
  }
  const totalBytes = [...usage.values()].reduce((a, b) => a + b, 0);
  const metas = new Map<string, GalleryMeta | null>(
    await Promise.all(galleries.map(async (g) => [g.id, await getMeta(g.id).catch(() => null)] as const)),
  );
  const orphans = [...usage.keys()].filter((gid) => !galleries.some((g) => g.id === gid));

  const active = galleries.filter((g) => metas.get(g.id)?.plan && !isExpired(metas.get(g.id) ?? null)).length;
  const expired = galleries.filter((g) => isExpired(metas.get(g.id) ?? null)).length;
  const value = galleries.reduce((sum, g) => {
    const m = metas.get(g.id);
    const plan = getPlan(m?.plan);
    return sum + (plan && m?.period ? plan.prices[m.period] : 0);
  }, 0);
  const storageCostUsd = Math.max(0, totalBytes / GB - 10) * 0.015;

  const tiles = [
    { label: "Fotografowie", value: String(users.length) },
    { label: "Galerie (aktywne / wygasłe)", value: `${galleries.length} (${active} / ${expired})` },
    { label: "Zajęte miejsce", value: formatBytes(totalBytes) },
    { label: "Koszt R2 miesięcznie", value: `${storageCostUsd.toFixed(2)} USD` },
    { label: "Wartość pakietów (test)", value: `${value} zł` },
  ];

  return (
    <main className="app-main admin">
      <h1>Przegląd</h1>
      <div className="stat-tiles admin-tiles">
        {tiles.map((t) => (
          <div key={t.label} className="stat-tile">
            <p className="stat-value">{t.value}</p>
            <p className="stat-label">{t.label}</p>
          </div>
        ))}
      </div>

      <section className="settings-card">
        <h2>Fotografowie</h2>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>E-mail</th>
                <th>Studio</th>
                <th>Galerie</th>
                <th>Miejsce</th>
                <th>Konto od</th>
                <th>Ostatnie logowanie</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const own = galleries.filter((g) => g.owner_id === u.id);
                const bytes = own.reduce((s, g) => s + (usage.get(g.id) ?? 0), 0);
                return (
                  <tr key={u.id}>
                    <td>
                      {u.email}
                      {!u.email_confirmed_at && <span className="badge-soft">niepotwierdzony</span>}
                    </td>
                    <td>{studios.get(u.id) ?? "–"}</td>
                    <td>{own.length}</td>
                    <td>{formatBytes(bytes)}</td>
                    <td>{fmtDate(u.created_at)}</td>
                    <td>{fmtDate(u.last_sign_in_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="settings-card">
        <h2>Galerie</h2>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Galeria</th>
                <th>Fotograf</th>
                <th>Pakiet</th>
                <th>Dostęp do</th>
                <th>Miejsce</th>
              </tr>
            </thead>
            <tbody>
              {galleries.map((g) => {
                const m = metas.get(g.id) ?? null;
                const plan = getPlan(m?.plan);
                return (
                  <tr key={g.id}>
                    <td>
                      <a href={`/galeria/${g.id}`} target="_blank" rel="noreferrer">
                        {g.title}
                      </a>
                    </td>
                    <td>{g.owner_id ? (emails.get(g.owner_id) ?? "–") : "brak właściciela"}</td>
                    <td>{plan ? `${plan.name} · ${m?.period} mies.` : "–"}</td>
                    <td className={isExpired(m) ? "is-expired" : undefined}>{fmtDate(m?.expiresAt)}</td>
                    <td>{formatBytes(usage.get(g.id) ?? 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {orphans.length > 0 && (
          <p className="hint-inline">
            Pliki w magazynie bez galerii w bazie: {orphans.map((o) => `${o} (${formatBytes(usage.get(o) ?? 0)})`).join(", ")}.
          </p>
        )}
      </section>
    </main>
  );
}
