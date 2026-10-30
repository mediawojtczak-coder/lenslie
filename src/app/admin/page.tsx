import { adminClient } from "@/lib/supabase/admin";
import { listProSubs, proActive, proInGrace, proGraceEnd, proTier, proName } from "@/lib/pro";
import { getSignupSource, sourceDetail, type SignupSource } from "@/lib/signup-source";
import { listObjects } from "@/lib/photos";
import { getMeta, isExpired, type GalleryMeta } from "@/lib/galleries";
import { getPlan, formatBytes } from "@/lib/plans";
import ConfirmButton from "./ConfirmButton";
import { listOrders } from "@/lib/p24";
import { getReminders } from "@/lib/reminders";
import { getAlbumSub, albumActive, ALBUM_PRICES } from "@/lib/albums";
import { listTokens } from "@/lib/lr";
import { listPrintOrders, zipDownloadUrl } from "@/lib/print";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Warsaw" });
const fmtDate = (d?: string | null) => (d ? dateFmt.format(new Date(d)) : "–");
const GB = 1e9;

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
  const orders = allOrders.slice(0, 200);
  const paidOrders = orders.filter((o) => o.status === "paid").slice(0, 100);
  const pendingOrders = orders.filter((o) => o.status !== "paid" && Date.now() - new Date(o.createdAt).getTime() < 7 * 24 * 3600 * 1000);
  const users = usersRes.data?.users ?? [];
  // Dodatki fotografów: Projektor albumów i wtyczka Lightroom
  const addons = await Promise.all(
    users.map(async (u) => {
      const [sub, tokens] = await Promise.all([getAlbumSub(u.id).catch(() => ({})), listTokens(u.id).catch(() => [])]);
      return { id: u.id, email: u.email ?? "", sub: sub as { paidUntil?: string; freeGallery?: string }, lr: tokens.length, lrLast: tokens[0]?.createdAt ?? null };
    }),
  );
  // Skąd przyszli fotografowie (zapisywane przy rejestracji od 29.10.2026)
  const sources = new Map<string, SignupSource | null>(await Promise.all(users.map(async (u): Promise<[string, SignupSource | null]> => [u.id, await getSignupSource(u.id)])));
  const recent = Date.now() - 30 * 24 * 3600 * 1000;
  const sourceStats = new Map<string, { all: number; month: number }>();
  for (const u of users) {
    const s = sources.get(u.id);
    if (!s) continue;
    const row = sourceStats.get(s.label) ?? { all: 0, month: 0 };
    row.all += 1;
    if (new Date(u.created_at).getTime() >= recent) row.month += 1;
    sourceStats.set(s.label, row);
  }
  const sourceRows = [...sourceStats.entries()].sort((a, b) => b[1].all - a[1].all);
  const printOrders = await listPrintOrders().catch(() => []);
  // Abonamenty Pro
  const proSubs = (await listProSubs().catch(() => [])).sort((a, b) => b.paidUntil.localeCompare(a.paidUntil));
  const proActiveSubs = proSubs.filter((s) => proActive(s));
  const proMrr = proActiveSubs.reduce((sum, s) => {
    const tier = proTier(s.tier);
    return sum + (tier ? (s.months === 12 ? tier.yearly / 12 : tier.monthly) : 0);
  }, 0);
  const printLinks = new Map(await Promise.all(printOrders.map(async (o) => [o.id, await zipDownloadUrl(o.id).catch(() => "")] as const)));
  const albumPaid = addons.filter((a) => albumActive(a.sub)).length;
  const albumFree = addons.filter((a) => a.sub.freeGallery).length;
  const lrUsers = addons.filter((a) => a.lr > 0).length;
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

  const ordersTable = (list: typeof orders) => (
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
                {list.map((o) => (
                  <tr key={o.sessionId}>
                    <td data-l="Data">{fmtDate(o.paidAt ?? o.createdAt)}</td>
                    <td data-l="Kwota">
                      {(o.amount / 100).toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł
                      {o.status !== "paid" && <span className="badge-soft">{o.status === "pending" ? "nieopłacona" : "błąd"}</span>}
                    </td>
                    <td data-l="Za co" className="wrap">{o.description.replace(/^Lenslie [–-] /, "")}</td>
                    <td data-l="Konto">{o.email}</td>
                    <td data-l="Faktura" className="wrap">
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
  );

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
                  <td data-l="Miesiąc">{m.label}</td>
                  <td data-l="Przychód brutto">{gr(m.revenue)}</td>
                  <td data-l="w tym doładowania">{gr(m.topups)}</td>
                  <td data-l="Prowizja P24 (szac.)">{gr(m.fee)}</td>
                  <td data-l="Płatności">{m.count}</td>
                  <td data-l="Nowi fotografowie">{m.users}</td>
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
        {paidOrders.length === 0 ? <p className="hint-inline">Brak opłaconych płatności.</p> : ordersTable(paidOrders)}
        {pendingOrders.length > 0 && (
          <details className="pending-orders">
            <summary>Nieopłacone – przerwane płatności z ostatnich 7 dni ({pendingOrders.length})</summary>
            <p className="hint-inline">Ktoś zaczął płacić, ale nie dokończył albo bramka zwróciła błąd. Nic nie wpłynęło – to tylko podpowiedź, do kogo warto się odezwać.</p>
            {ordersTable(pendingOrders)}
          </details>
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

      <section className="settings-card" id="albumy">
        <h2>Zamówienia wydruku albumów</h2>
        {printOrders.length === 0 ? (
          <p className="hint-inline">Brak zamówień. Fotografowie zamawiają druk w zakładce „Album” galerii (15×15, 20×20, 25×25 cm).</p>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Album</th>
                  <th>Kwota</th>
                  <th>Wysyłka</th>
                  <th>Pliki</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {printOrders.map((o) => (
                  <tr key={o.id}>
                    <td data-l="Data">{fmtDate(o.paidAt ?? o.createdAt)}</td>
                    <td data-l="Album" className="wrap">
                      {o.format} cm · {o.pages} str.{o.copies > 1 ? ` × ${o.copies}` : ""} · „{o.title}”
                      <br />
                      <small>{o.email}</small>
                      {o.spreads * 2 < o.pages && (
                        <>
                          <br />
                          <small>projekt: {o.spreads * 2} str. – dopełnij pustymi</small>
                        </>
                      )}
                    </td>
                    <td data-l="Kwota">{o.price.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł</td>
                    <td data-l="Wysyłka" className="wrap">
                      Paczkomat {o.shipping.locker}
                      <br />
                      <small>
                        {o.shipping.name}, {o.shipping.phone}, {o.shipping.email}
                      </small>
                    </td>
                    <td data-l="Pliki">{printLinks.get(o.id) ? <a href={printLinks.get(o.id)}>Pobierz ZIP</a> : "–"}</td>
                    <td data-l="Status" className="wrap">
                      <form method="post" action="/api/admin/print" className="inv-cell">
                        <input type="hidden" name="id" value={o.id} />
                        <select name="status" defaultValue={o.status} className="plain-select" style={{ margin: 0 }}>
                          <option value="paid">Opłacone – do zamówienia</option>
                          <option value="ordered">Zamówione w drukarni</option>
                          <option value="sent">Wysłane</option>
                        </select>
                        <input name="tracking" defaultValue={o.tracking ?? ""} placeholder="Nr przesyłki InPost" style={{ margin: 0 }} />
                        <button type="submit" className="inv-btn">Zapisz</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="hint-inline">Przy zmianie na „Wysłane” fotograf dostaje maila z numerem przesyłki. Link do plików jest ważny 7 dni od otwarcia tej strony.</p>
      </section>

      <section className="settings-card" id="pro">
        <h2>Abonamenty Pro</h2>
        <p className="hint-inline">
          Aktywne: {proActiveSubs.length} · miesięcznie ok. {proMrr.toLocaleString("pl-PL", { maximumFractionDigits: 0 })} zł brutto · w okresie łaski:{" "}
          {proSubs.filter((s) => proInGrace(s)).length}
        </p>
        {proSubs.length ? (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Fotograf</th>
                  <th>Pakiet</th>
                  <th>Okres</th>
                  <th>Opłacony do</th>
                  <th>Od</th>
                </tr>
              </thead>
              <tbody>
                {proSubs.map((s) => {
                  const tier = proTier(s.tier);
                  return (
                    <tr key={s.uid}>
                      <td data-l="Fotograf">{emails.get(s.uid) ?? s.uid}</td>
                      <td data-l="Pakiet">{tier ? proName(tier) : s.tier}</td>
                      <td data-l="Okres">{s.months === 12 ? "rok" : "miesiąc"}</td>
                      <td data-l="Opłacony do" className={proActive(s) ? undefined : "is-expired"}>
                        {fmtDate(s.paidUntil)}
                        {proInGrace(s) && <span className="badge-soft">łaska do {fmtDate(proGraceEnd(s).toISOString())}</span>}
                      </td>
                      <td data-l="Od">{fmtDate(s.since)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="hint-inline">Nikt jeszcze nie kupił abonamentu Pro.</p>
        )}
      </section>

      <section className="settings-card" id="dodatki">
        <h2>Projektor albumów i wtyczka Lightroom</h2>
        <div className="stat-tiles">
          <div className="stat-tile">
            <p className="stat-value">{albumPaid}</p>
            <p className="stat-label">Aktywne abonamenty projektora ({ALBUM_PRICES[1]} zł/mies., {ALBUM_PRICES[12]} zł/rok)</p>
          </div>
          <div className="stat-tile">
            <p className="stat-value">{albumFree}</p>
            <p className="stat-label">Wykorzystane darmowe albumy na próbę</p>
          </div>
          <div className="stat-tile">
            <p className="stat-value">{lrUsers}</p>
            <p className="stat-label">Fotografowie z wtyczką Lightroom</p>
          </div>
        </div>
        {addons.some((a) => a.sub.paidUntil || a.sub.freeGallery || a.lr) ? (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Konto</th>
                  <th>Projektor albumów</th>
                  <th>Album na próbę</th>
                  <th>Lightroom</th>
                </tr>
              </thead>
              <tbody>
                {addons
                  .filter((a) => a.sub.paidUntil || a.sub.freeGallery || a.lr)
                  .map((a) => (
                    <tr key={a.id}>
                      <td data-l="Konto">{a.email}</td>
                      <td data-l="Projektor albumów" className={a.sub.paidUntil && !albumActive(a.sub) ? "is-expired" : undefined}>
                        {a.sub.paidUntil ? `${albumActive(a.sub) ? "do" : "wygasł"} ${fmtDate(a.sub.paidUntil)}` : "–"}
                      </td>
                      <td data-l="Album na próbę">
                        {a.sub.freeGallery ? (
                          <a href={`/galeria/${a.sub.freeGallery}`} target="_blank" rel="noreferrer">
                            {a.sub.freeGallery}
                          </a>
                        ) : (
                          "–"
                        )}
                      </td>
                      <td data-l="Lightroom">{a.lr ? `${a.lr} ${a.lr === 1 ? "komputer" : "komputery"} · od ${fmtDate(a.lrLast)}` : "–"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="hint-inline">Nikt jeszcze nie kupił abonamentu projektora, nie pobrał albumu na próbę ani nie połączył Lightrooma.</p>
        )}
        <p className="hint-inline">
          Zakupy abonamentu widać też w „Płatnościach” jako „projektor albumów”. Twoje konto admina pobiera albumy bez abonamentu, więc nie liczy się tutaj.
        </p>
      </section>

      <section className="settings-card" id="zrodla">
        <h2>Skąd przychodzą fotografowie</h2>
        {sourceRows.length ? (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Źródło</th>
                  <th>Ostatnie 30 dni</th>
                  <th>Razem</th>
                </tr>
              </thead>
              <tbody>
                {sourceRows.map(([label, n]) => (
                  <tr key={label}>
                    <td data-l="Źródło">{label}</td>
                    <td data-l="Ostatnie 30 dni">{n.month}</td>
                    <td data-l="Razem">{n.all}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="hint-inline">Źródła zapisujemy od 29 października 2026 – pojawią się tu przy kolejnych rejestracjach.</p>
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
                <th>Źródło</th>
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
                    <td data-l="E-mail">
                      {u.email}
                      {!u.email_confirmed_at && <span className="badge-soft">niepotwierdzony</span>}
                    </td>
                    <td data-l="Studio">{studios.get(u.id) ?? "–"}</td>
                    <td data-l="Galerie">{own.length}</td>
                    <td data-l="Miejsce">{formatBytes(bytes)}</td>
                    <td data-l="Źródło">
                      {sources.get(u.id)?.label ?? "–"}
                      {sourceDetail(sources.get(u.id) ?? null) && <small className="src-detail">{sourceDetail(sources.get(u.id) ?? null)}</small>}
                    </td>
                    <td data-l="Konto od">{fmtDate(u.created_at)}</td>
                    <td data-l="Ostatnie logowanie">{fmtDate(u.last_sign_in_at)}</td>
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
                    <td data-l="Galeria">
                      <a href={`/galeria/${g.id}`} target="_blank" rel="noreferrer">
                        {g.title}
                      </a>
                    </td>
                    <td data-l="Fotograf">{g.owner_id ? (emails.get(g.owner_id) ?? "–") : "brak właściciela"}</td>
                    <td data-l="Pakiet">{m?.plan === "pro" ? "Abonament Pro" : plan ? `${plan.name} · ${m?.period} mies.` : "–"}</td>
                    <td data-l="Dostęp do" className={isExpired(m) ? "is-expired" : undefined}>{fmtDate(m?.expiresAt)}</td>
                    <td data-l="Miejsce">{formatBytes(usage.get(g.id) ?? 0)}</td>
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
