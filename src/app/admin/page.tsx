import { adminClient } from "@/lib/supabase/admin";
import { listObjects } from "@/lib/photos";
import { getMeta, isExpired, type GalleryMeta } from "@/lib/galleries";
import { getPlan, formatBytes } from "@/lib/plans";
import ConfirmButton from "./ConfirmButton";
import { listOrders } from "@/lib/p24";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Warsaw" });
const fmtDate = (d?: string | null) => (d ? dateFmt.format(new Date(d)) : "–");
const GB = 1024 ** 3;

type G = { id: string; title: string; owner_id: string | null; created_at: string };

const MAIL: Record<string, string> = {
  wyslany: "Testowy e-mail został wysłany. Sprawdź skrzynkę (także folder Spam).",
  "brak-klucza": "Brak zmiennej RESEND_API_KEY w Vercelu (albo nie zrobiono Redeploy).",
  blad: "Resend odrzucił wysyłkę. Sprawdź, czy klucz ma dostęp do domeny lenslie.com i czy domena jest zweryfikowana.",
};

export default async function Admin({ searchParams }: { searchParams: Promise<{ mail?: string; reset?: string; usuniete?: string }> }) {
  const { mail, reset, usuniete } = await searchParams;
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

  const orders = (await listOrders().catch(() => [])).filter((o) => o.status === "paid" || Date.now() - new Date(o.createdAt).getTime() < 24 * 3600 * 1000);
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
      <div className="admin-head">
        <h1>Przegląd</h1>
        <div className="admin-actions">
          <form method="post" action="/api/admin/test-email">
            <button type="submit" className="btn btn-ghost btn-small">Wyślij testowy mail</button>
          </form>
          <form method="post" action="/api/admin/test-reset">
            <button type="submit" className="btn btn-ghost btn-small">Test maila resetu hasła</button>
          </form>
        </div>
      </div>
      {mail && MAIL[mail] && <p className={mail === "wyslany" ? "success-box" : "warn-inline"}>{MAIL[mail]}</p>}
      {usuniete && <p className="success-box">{usuniete}</p>}
      {reset && <p className={reset.startsWith("OK") ? "success-box" : "warn-inline"}>Reset hasła: {reset}</p>}
      <div className="stat-tiles admin-tiles">
        {tiles.map((t) => (
          <div key={t.label} className="stat-tile">
            <p className="stat-value">{t.value}</p>
            <p className="stat-label">{t.label}</p>
          </div>
        ))}
      </div>

      <section className="settings-card" id="platnosci">
        <h2>Płatności</h2>
        {orders.length === 0 ? (
          <p className="hint-inline">Brak płatności.</p>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Kwota</th>
                  <th>Za co</th>
                  <th>Konto</th>
                  <th>Faktura</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.sessionId}>
                    <td>{fmtDate(o.paidAt ?? o.createdAt)}</td>
                    <td>
                      {(o.amount / 100).toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł
                      {o.status !== "paid" && <span className="badge-soft">{o.status === "pending" ? "nieopłacona" : "błąd"}</span>}
                    </td>
                    <td className="wrap">{o.description.replace(/^Lenslie – /, "")}</td>
                    <td>{o.email}</td>
                    <td className="wrap">
                      {o.status !== "paid" ? (
                        "–"
                      ) : o.invoice ? (
                        <div className="inv-cell">
                          <span>
                            {o.invoice.company}, NIP {o.invoice.nip}
                            <br />
                            {o.invoice.street}, {o.invoice.postcode} {o.invoice.city}
                          </span>
                          <form method="post" action="/api/admin/invoice">
                            <input type="hidden" name="sid" value={o.sessionId} />
                            <input type="hidden" name="issued" value={o.invoiceIssued ? "0" : "1"} />
                            <button type="submit" className={o.invoiceIssued ? "inv-btn done" : "inv-btn"}>
                              {o.invoiceIssued ? "✓ Wystawiona" : "Oznacz jako wystawioną"}
                            </button>
                          </form>
                        </div>
                      ) : (
                        <span className="hint-inline">nie chce</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

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
          <div className="orphans">
            <p className="hint-inline">Pliki w magazynie bez galerii w bazie (pozostałości po testach):</p>
            <ul>
              {orphans.map((o) => (
                <li key={o}>
                  <span>
                    {o} · {formatBytes(usage.get(o) ?? 0)}
                  </span>
                  <form method="post" action="/api/admin/orphan" data-confirm={o}>
                    <input type="hidden" name="id" value={o} />
                    <ConfirmButton message={`Usunąć na stałe wszystkie pliki „${o}” z magazynu?`}>Usuń pliki</ConfirmButton>
                  </form>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </main>
  );
}
