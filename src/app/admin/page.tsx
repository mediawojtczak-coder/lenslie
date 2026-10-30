import { adminClient } from "@/lib/supabase/admin";
import { listProSubs, proActive, proInGrace, proGraceEnd, proTier, proName } from "@/lib/pro";
import { getSignupSource, sourceDetail, type SignupSource } from "@/lib/signup-source";
import { listObjects } from "@/lib/photos";
import { getMeta, isExpired, type GalleryMeta } from "@/lib/galleries";
import { getPlan, formatBytes } from "@/lib/plans";
import { videoCost, galleryVideoBytes, USD_PLN, R2_GB_MONTH, STREAM_MIN_MONTH, STREAM_MIN_VIEW } from "@/lib/videos";
import { getStreamStats, minutesViewedSince } from "@/lib/stream-stats";
import { FIXED_COSTS, fixedCostFor } from "@/lib/platform-costs";

// Szacowany zysk na galerii (zł): cena pakietu minus prowizja płatności i koszty magazynu oraz podglądu filmów
// przez okres pakietu. Bez przedłużeń i dopłat za zmianę pakietu; koszt filmów zakłada ok. 30 pełnych obejrzeń.
const PAY_FEE = 0.02; // prowizja Przelewy24 (szacunek)
function galleryProfit(m: GalleryMeta | null, bytes: number, paid?: number) {
  const plan = getPlan(m?.plan);
  if (!m || !plan || !m.period) return null;
  // tylko faktycznie zapłacone (pakiet z przedłużeniami + dodatki); bez wpłaty zostają same koszty
  const revenue = paid ?? 0;
  const months = m.period;
  const vids = (m.videos ?? []).filter((v) => v.status !== "error");
  const photoBytes = Math.max(0, bytes - galleryVideoBytes(m.videos));
  const photos = (photoBytes / 1e9) * R2_GB_MONTH * months * USD_PLN;
  const videos = vids.reduce((s, v) => s + videoCost(v.size, v.duration, months), 0);
  const cost = revenue * PAY_FEE + photos + videos;
  return { revenue, cost, profit: revenue - cost };
}
const zlx = (n: number) => `${n < 0 ? "−" : ""}${Math.abs(n).toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł`;
import ConfirmButton from "./ConfirmButton";
import { listOrders } from "@/lib/p24";
import { getWallet, type WalletEntry } from "@/lib/wallet";
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

  const [usersRes, galleriesRes, profilesRes, objects, videoObjects] = await Promise.all([
    db.auth.admin.listUsers({ perPage: 1000 }),
    db.from("galleries").select("id, title, owner_id, created_at").order("created_at", { ascending: false }),
    db.from("profiles").select("id, studio_name"),
    listObjects("galleries/").catch(() => []),
    listObjects("videos/").catch(() => []),
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

  // Zajęte miejsce każdej galerii w jednym przejściu po magazynie (zdjęcia + filmy)
  const usage = new Map<string, number>();
  for (const o of [...objects, ...videoObjects]) {
    const gid = o.key.split("/")[1];
    usage.set(gid, (usage.get(gid) ?? 0) + o.size);
  }
  const totalBytes = [...usage.values()].reduce((a, b) => a + b, 0);
  const metas = new Map<string, GalleryMeta | null>(
    await Promise.all(galleries.map(async (g) => [g.id, await getMeta(g.id).catch(() => null)] as const)),
  );
  const orphans = [...usage.keys()].filter((gid) => !galleries.some((g) => g.id === gid));

  // Filmy: oglądanie (Cloudflare Stream) i koszty podglądu
  const allVideos = galleries.flatMap((g) => (metas.get(g.id)?.videos ?? []).map((v) => ({ g, v })));
  const streamStats = allVideos.some(({ v }) => v.streamUid) ? await getStreamStats() : null;

  // ===== Koszty utrzymania platformy: bieżący tydzień, miesiąc i rok =====
  const nowD = new Date();
  const weekStart = new Date(Date.UTC(nowD.getUTCFullYear(), nowD.getUTCMonth(), nowD.getUTCDate() - ((nowD.getUTCDay() + 6) % 7)));
  const monthStart = new Date(Date.UTC(nowD.getUTCFullYear(), nowD.getUTCMonth(), 1));
  const firstGallery = galleries.reduce((min, g) => Math.min(min, new Date(g.created_at).getTime()), Date.now());
  // każdy okres liczony najwcześniej od startu Lenslie (dzień pierwszej galerii)
  const launch = new Date(new Date(firstGallery).toISOString().slice(0, 10)).getTime();
  const clip = (d: Date) => new Date(Math.max(d.getTime(), launch));
  const periods = [
    { key: "week", label: "Ten tydzień", start: clip(weekStart) },
    { key: "month", label: "Ten miesiąc", start: clip(monthStart) },
    { key: "year", label: `Rok ${nowD.getUTCFullYear()}`, start: clip(new Date(Date.UTC(nowD.getUTCFullYear(), 0, 1))) },
  ] as const;
  const daysOf = (start: Date) => Math.max(0, (nowD.getTime() - start.getTime()) / (24 * 3600 * 1000));
  const streamMinutesStored = allVideos.reduce((s, { v }) => s + (v.streamUid ? Math.max(1, Math.ceil(v.duration / 60)) : 0), 0);
  const viewed = allVideos.some(({ v }) => v.streamUid)
    ? await Promise.all(periods.map((p) => minutesViewedSince(p.start)))
    : periods.map(() => ({ ok: true as const, minutes: 0, from: new Date() }));
  const paidIn = (start: Date) =>
    allOrders.filter((o) => o.status === "paid" && new Date(o.paidAt ?? o.createdAt).getTime() >= start.getTime()).reduce((s, o) => s + o.amount / 100, 0);
  const costRows: { name: string; note?: string; values: (number | null)[] }[] = [
    {
      name: "Magazyn plików (Cloudflare R2)",
      note: `${formatBytes(totalBytes)} · 0,015 USD za GB/mies. (pierwsze 10 GB gratis)`,
      values: periods.map((p) => (Math.max(0, totalBytes / 1e9 - 10) * R2_GB_MONTH * USD_PLN * daysOf(p.start)) / 30.44),
    },
    {
      name: "Podglądy filmów – przechowanie (Stream)",
      note: `${streamMinutesStored} min filmów · 5 USD za 1000 min/mies.`,
      values: periods.map((p) => (streamMinutesStored * STREAM_MIN_MONTH * USD_PLN * daysOf(p.start)) / 30.44),
    },
    {
      name: "Podglądy filmów – oglądanie (Stream)",
      note: "1 USD za 1000 obejrzanych minut (dane Cloudflare z max 90 dni)",
      values: viewed.map((v) => (v.ok ? v.minutes * STREAM_MIN_VIEW * USD_PLN : null)),
    },
    {
      name: "Prowizje płatności (Przelewy24)",
      note: "ok. 2% wpłat",
      values: periods.map((p) => paidIn(p.start) * PAY_FEE),
    },
    ...FIXED_COSTS.map((c) => ({ name: c.name, note: c.note, values: periods.map((p) => fixedCostFor(c, p.start, nowD, USD_PLN)) })),
  ];
  const costTotals = periods.map((_, i) => costRows.reduce((s, r) => s + (r.values[i] ?? 0), 0));
  const incomeTotals = periods.map((p) => paidIn(p.start));

  // Ile zapłacono za każdą galerię: płatności Przelewy24 (fotograf i klient przedłużający dostęp)
  // oraz zakupy z salda fotografa (opis kończy się nazwą galerii)
  // Podział: pakiet (publikacja, zmiana, przedłużenie), dodatki (motyw, Znajdź siebie, filmy…), wydruk albumu (osobno – ma własne koszty)
  type Paid = { total: number; plan: number; addons: number; print: number; byClient: number; wallet: number };
  const paidFor = new Map<string, Paid>();
  const addPaid = (gid: string, zl: number, cat: "plan" | "addons" | "print", how: "p24" | "client" | "wallet") => {
    const p = paidFor.get(gid) ?? { total: 0, plan: 0, addons: 0, print: 0, byClient: 0, wallet: 0 };
    p[cat] += zl;
    if (cat !== "print") p.total += zl;
    if (how === "client") p.byClient += zl;
    if (how === "wallet") p.wallet += zl;
    paidFor.set(gid, p);
  };
  for (const o of allOrders) {
    if (o.status !== "paid" || !o.galleryId) continue;
    const a = o.action as { action: string; product?: string };
    const cat = ["choose", "upgrade", "extend"].includes(a.action) ? "plan" : a.product === "print" ? "print" : "addons";
    addPaid(o.galleryId, o.amount / 100, cat, o.byClient ? "client" : "p24");
  }
  const owners = [...new Set(galleries.map((g) => g.owner_id).filter((x): x is string => Boolean(x)))];
  const wallets = new Map<string, WalletEntry[]>(
    await Promise.all(owners.map(async (uid) => [uid, (await getWallet(uid).catch(() => ({ history: [] as WalletEntry[] }))).history] as const)),
  );
  for (const g of galleries) {
    if (!g.owner_id) continue;
    for (const h of wallets.get(g.owner_id) ?? []) {
      if (h.type !== "spend" || !h.description.endsWith(` – ${g.title}`)) continue;
      const cat = (h.ref ?? "").startsWith("print-")
        ? "print"
        : /^(publikacja galerii|zmiana pakietu|przedłużenie dostępu)/.test(h.description)
          ? "plan"
          : "addons";
      addPaid(g.id, Math.abs(h.amount) / 100, cat, "wallet");
    }
  }

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
        <h2>Koszty utrzymania platformy</h2>
        <p className="hint-inline">
          Szacunek od początku tygodnia (poniedziałek), miesiąca i roku do dziś. Magazyn i podglądy liczone według obecnego stanu, proporcjonalnie do liczby dni.
          Koszty stałe ustawisz w pliku src/lib/platform-costs.ts. Wpłaty = płatności Przelewy24 (doładowania salda i zakupy), bez bonusów.
        </p>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Koszt</th>
                {periods.map((p) => (
                  <th key={p.key}>
                    {p.label}
                    <small style={{ display: "block", color: "var(--taupe)", fontWeight: 400 }}>od {fmtDate(p.start.toISOString())}</small>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {costRows.map((r) => (
                <tr key={r.name}>
                  <td data-l="Koszt">
                    {r.name}
                    {r.note && <small style={{ display: "block", color: "var(--taupe)" }}>{r.note}</small>}
                  </td>
                  {r.values.map((v, i) => (
                    <td key={periods[i].key} data-l={periods[i].label}>
                      {v === null ? "brak danych" : zlx(v)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Razem koszty</td>
                {costTotals.map((v, i) => (
                  <td key={periods[i].key}>{zlx(v)}</td>
                ))}
              </tr>
              <tr>
                <td>Wpłaty (Przelewy24)</td>
                {incomeTotals.map((v, i) => (
                  <td key={periods[i].key}>{zlx(v)}</td>
                ))}
              </tr>
              <tr>
                <td>Wynik</td>
                {incomeTotals.map((v, i) => (
                  <td key={periods[i].key} className={v - costTotals[i] < 0 ? "is-expired" : undefined}>
                    {zlx(v - costTotals[i])}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {allVideos.length > 0 && (
        <section className="settings-card">
          <h2>Filmy – oglądanie i koszty</h2>
          <p className="hint-inline">
            Minuty obejrzane z Cloudflare Stream (dane próbkowane, mogą różnić się od faktury). Koszt oglądania: 1 USD za 1000 minut, przechowanie
            podglądu: 5 USD za 1000 minut filmu miesięcznie (kurs {USD_PLN} zł). „Pełne obejrzenia” = minuty obejrzane ÷ długość filmu.
          </p>
          {streamStats && !streamStats.ok && (
            <p className="warn-inline">
              Nie udało się pobrać statystyk z Cloudflare: {streamStats.error}. Utwórz w Cloudflare token z uprawnieniem „Account Analytics: Read” i dodaj go w
              Vercelu jako zmienną CLOUDFLARE_ANALYTICS_TOKEN.
            </p>
          )}
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Film</th>
                  <th>Galeria</th>
                  <th>Długość</th>
                  <th>Obejrzane 30 dni</th>
                  <th>Obejrzane 90 dni</th>
                  <th>≈ pełne obejrzenia (90 dni)</th>
                  <th>Koszt oglądania (90 dni)</th>
                  <th>Podgląd / mies.</th>
                </tr>
              </thead>
              <tbody>
                {allVideos.map(({ g, v }) => {
                  const min = Math.max(1, Math.ceil(v.duration / 60));
                  const m30 = streamStats?.ok && v.streamUid ? (streamStats.d30.get(v.streamUid) ?? 0) : null;
                  const m90 = streamStats?.ok && v.streamUid ? (streamStats.d90.get(v.streamUid) ?? 0) : null;
                  const fmtMin = (x: number | null) => (x === null ? "–" : `${Math.round(x).toLocaleString("pl-PL")} min`);
                  return (
                    <tr key={`${g.id}-${v.id}`}>
                      <td data-l="Film">{v.name}</td>
                      <td data-l="Galeria">
                        <a href={`/galeria/${g.id}`} target="_blank" rel="noreferrer">
                          {g.title}
                        </a>
                      </td>
                      <td data-l="Długość">{min} min</td>
                      <td data-l="Obejrzane 30 dni">{fmtMin(m30)}</td>
                      <td data-l="Obejrzane 90 dni">{fmtMin(m90)}</td>
                      <td data-l="Pełne obejrzenia">{m90 === null ? "–" : (m90 / min).toLocaleString("pl-PL", { maximumFractionDigits: 1 })}</td>
                      <td data-l="Koszt oglądania">{m90 === null ? "–" : zlx(m90 * STREAM_MIN_VIEW * USD_PLN)}</td>
                      <td data-l="Podgląd / mies.">{v.streamUid ? zlx(min * STREAM_MIN_MONTH * USD_PLN) : "–"}</td>
                    </tr>
                  );
                })}
              </tbody>
              {streamStats?.ok && (
                <tfoot>
                  <tr>
                    <td colSpan={6}>Razem</td>
                    <td>
                      {zlx(allVideos.reduce((s, { v }) => s + (v.streamUid ? (streamStats.d90.get(v.streamUid) ?? 0) : 0), 0) * STREAM_MIN_VIEW * USD_PLN)}
                    </td>
                    <td>
                      {zlx(allVideos.reduce((s, { v }) => s + (v.streamUid ? Math.max(1, Math.ceil(v.duration / 60)) : 0), 0) * STREAM_MIN_MONTH * USD_PLN)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </section>
      )}

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
                <th title="Suma płatności za galerię: Przelewy24 (fotograf i klient) oraz zakupy z salda">Zapłacono</th>
                <th title="Zapłacona kwota (albo cena pakietu) minus prowizja płatności (2%) i koszt magazynu oraz podglądu filmów przez okres pakietu">Szac. zysk</th>
              </tr>
            </thead>
            <tbody>
              {galleries.map((g) => {
                const m = metas.get(g.id) ?? null;
                const plan = getPlan(m?.plan);
                const paid = paidFor.get(g.id);
                const pr = galleryProfit(m, usage.get(g.id) ?? 0, paid?.total);
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
                    <td
                      data-l="Zapłacono"
                      title={
                        paid
                          ? `Pakiet: ${zlx(paid.plan)} · dodatki: ${zlx(paid.addons)}${paid.print ? ` · wydruk albumu (poza sumą): ${zlx(paid.print)}` : ""} · z salda: ${zlx(paid.wallet)} · klient: ${zlx(paid.byClient)}`
                          : undefined
                      }
                    >
                      {paid && paid.total > 0 ? zlx(paid.total) : "–"}
                      {paid && paid.addons > 0 && (
                        <small style={{ display: "block", color: "var(--taupe)" }}>
                          pakiet {zlx(paid.plan)} + dodatki {zlx(paid.addons)}
                        </small>
                      )}
                      {paid && paid.byClient > 0 && <small style={{ display: "block", color: "var(--taupe)" }}>w tym klient {zlx(paid.byClient)}</small>}
                    </td>
                    <td data-l="Szac. zysk" title={pr ? `Przychód ${zlx(pr.revenue)} · koszty ${zlx(pr.cost)}` : undefined} className={pr && pr.profit < 0 ? "is-expired" : undefined}>
                      {m?.plan === "pro" ? "w abonamencie" : pr ? zlx(pr.profit) : "–"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5}>Razem</td>
                <td>{zlx(galleries.reduce((s, g) => s + (paidFor.get(g.id)?.total ?? 0), 0))}</td>
                <td>
                  {zlx(galleries.reduce((s, g) => s + (galleryProfit(metas.get(g.id) ?? null, usage.get(g.id) ?? 0, paidFor.get(g.id)?.total)?.profit ?? 0), 0))}
                </td>
              </tr>
            </tfoot>
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
