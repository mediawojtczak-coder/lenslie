import { adminClient } from "@/lib/supabase/admin";
import { listObjects } from "@/lib/photos";
import { getMeta, isExpired, type GalleryMeta } from "@/lib/galleries";
import { getPlan, formatBytes } from "@/lib/plans";
import ConfirmButton from "./ConfirmButton";
import { listOrders } from "@/lib/p24";
import { getReminders } from "@/lib/reminders";

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

export default async function Admin({ searchParams }: { searchParams: Promise<{ mail?: string; reset?: string; usuniete?: string; gratis?: string }> }) {
  const { mail, reset, usuniete, gratis } = await searchParams;
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

  const reminders = await getReminders().catch(() => []);
  const allOrders = await listOrders(5000).catch(() => []);
  const orders = allOrders.slice(0, 100).filter((o) => o.status === "paid" || Date.now() - new Date(o.createdAt).getTime() < 24 * 3600 * 1000);
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

  // Statystyki sprzedaży: ostatnie 12 miesięcy
  const monthKey = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "Europe/Warsaw" }).slice(0, 7);
  const months: { key: string; label: string; revenue: number; fee: number; count: number; topups: number; users: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    months.push({
      key: monthKey(d),
      label: d.toLocaleDateString("pl-PL", { month: "short", year: "2-digit" }),
      revenue: 0,
      fee: 0,
      count: 0,
      topups: 0,
      users: 0,
    });
  }
  const mIndex = new Map(months.map((m, i) => [m.key, i]));
  for (const o of allOrders) {
    if (o.status !== "paid" || !o.paidAt) continue;
    const i = mIndex.get(monthKey(new Date(o.paidAt)));
    if (i === undefined) continue;
    months[i].revenue += o.amount;
    months[i].fee += Math.round(o.amount * 0.0129 + 30);
    months[i].count += 1;
    if (o.action.action === "topup") months[i].topups += o.amount;
  }
  for (const u of users) {
    const i = mIndex.get(monthKey(new Date(u.created_at)));
    if (i !== undefined) months[i].users += 1;
  }
  const thisMonth = months[months.length - 1];
  const maxRev = Math.max(1, ...months.map((m) => m.revenue));
  const gr = (n: number) => `${(n / 100).toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł`;

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

      {reminders.length > 0 && (
        <section className="settings-card reminders">
          <h2>Do zrobienia</h2>
          <ul>
            {reminders.map((r) => (
              <li key={r.id} className={`rem rem-${r.level}`}>
                <span className="rem-tag">{r.level}</span>
                <div>
                  <strong>{r.title}</strong>
                  <p>{r.text}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="hint-inline">Te same przypomnienia przychodzą raz w tygodniu mailem.</p>
        </section>
      )}

      <section className="settings-card" id="sprzedaz">
        <h2>Sprzedaż</h2>
        <div className="stat-tiles">
          <div className="stat-tile">
            <p className="stat-value">{gr(thisMonth.revenue)}</p>
            <p className="stat-label">Przychód w tym miesiącu (brutto)</p>
          </div>
          <div className="stat-tile">
            <p className="stat-value">{thisMonth.count}</p>
            <p className="stat-label">Płatności w tym miesiącu</p>
          </div>
          <div className="stat-tile">
            <p className="stat-value">{thisMonth.users}</p>
            <p className="stat-label">Nowi fotografowie w tym miesiącu</p>
          </div>
          <div className="stat-tile">
            <p className="stat-value">{gr(months.reduce((s, m) => s + m.revenue, 0))}</p>
            <p className="stat-label">Przychód z 12 miesięcy</p>
          </div>
        </div>
        <div className="rev-chart" role="img" aria-label="Przychód miesiąc po miesiącu">
          {months.map((m) => (
            <div key={m.key} className="rev-col" title={`${m.label}: ${gr(m.revenue)}`}>
              <span className="rev-val">{m.revenue ? Math.round(m.revenue / 100) : ""}</span>
              <div className="rev-bar">
                <span style={{ height: `${(m.revenue / maxRev) * 100}%` }} />
              </div>
              <span className="rev-label">{m.label}</span>
            </div>
          ))}
        </div>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Miesiąc</th>
                <th>Przychód brutto</th>
                <th>w tym doładowania</th>
                <th>Prowizja P24 (szac.)</th>
                <th>Płatności</th>
                <th>Nowi fotografowie</th>
              </tr>
            </thead>
            <tbody>
              {[...months].reverse().filter((m) => m.revenue || m.users).map((m) => (
                <tr key={m.key}>
                  <td>{m.label}</td>
                  <td>{gr(m.revenue)}</td>
                  <td>{gr(m.topups)}</td>
                  <td>{gr(m.fee)}</td>
                  <td>{m.count}</td>
                  <td>{m.users}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="hint-inline">
          Przychód to wpłaty przez Przelewy24 (publikacje, zmiany pakietu, doładowania). Zakupy z salda nie są liczone drugi raz.
        </p>
      </section>

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
                    <td className="wrap">{o.description.replace(/^Lenslie [–-] /, "")}</td>
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

      <section className="settings-card" id="gratis">
        <h2>Gratis dla fotografa</h2>
        <p className="hint-inline">Dopisuje kwotę do salda konta – fotograf opłaca nią dowolny pakiet jednym kliknięciem („Zapłać z salda”).</p>
        {gratis && (
          <p className={gratis === "ok" ? "success-box" : "warn-inline"}>
            {gratis === "ok"
              ? "Gratis dopisany do salda."
              : gratis === "brak"
                ? "Nie ma konta z tym adresem e-mail."
                : "Sprawdź e-mail i kwotę."}
          </p>
        )}
        <form method="post" action="/api/admin/gift" className="slot-gen">
          <div>
            <label htmlFor="gift-email">E-mail fotografa</label>
            <input id="gift-email" name="email" type="email" required list="gift-users" />
            <datalist id="gift-users">
              {users.map((u) => (
                <option key={u.id} value={u.email ?? ""} />
              ))}
            </datalist>
          </div>
          <div>
            <label htmlFor="gift-amount">Kwota</label>
            <select id="gift-amount" name="amount" className="plain-select" defaultValue="25">
              <option value="12">12 zł – galeria Mała na rok</option>
              <option value="18">18 zł – galeria Średnia na rok</option>
              <option value="25">25 zł – galeria Duża na rok</option>
              <option value="99">99 zł – Zdjęcia od gości</option>
              <option value="50">50 zł</option>
              <option value="100">100 zł</option>
            </select>
          </div>
          <div>
            <label htmlFor="gift-note">Opis w historii salda</label>
            <input id="gift-note" name="note" defaultValue="Gratis od Lenslie" maxLength={80} />
          </div>
          <button type="submit" className="btn">Dodaj gratis</button>
        </form>
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
