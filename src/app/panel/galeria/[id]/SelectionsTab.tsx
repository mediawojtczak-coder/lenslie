import { getUser } from "@/lib/supabase/server";
import SelectionActions from "./SelectionActions";
import OrderActions from "./OrderActions";
import { listSaleOrders, type SaleOrder } from "@/lib/sales";
import { money } from "@/lib/lang";
import { getLang } from "@/lib/lang-server";
import { tr, locale } from "@/lib/lang";


type Row = {
  id: string;
  client_name: string;
  client_email: string | null;
  photos: string[];
  note: string | null;
  updated_at: string;
};


// Ulubione zdjęcia wybrane przez klientów tej galerii
export default async function SelectionsTab({
  id,
  photos,
  selling = false,
}: {
  id: string;
  selling?: boolean;
  photos: { name: string; fileName: string; url: string }[];
}) {
  const { supabase } = await getUser();
  const lang = await getLang();
  const t = (pl: string, en: string) => tr(lang, pl, en);
  const fmt = new Intl.DateTimeFormat(locale(lang), { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Warsaw" });
  const { data, error } = await supabase
    .from("selections")
    .select("id, client_name, client_email, photos, note, updated_at")
    .eq("gallery_id", id)
    .order("updated_at", { ascending: false });

  if (error) {
    return (
      <p className="warn-inline">
        {t("Wybory klientów nie są jeszcze włączone.", "Client selections are not enabled yet.")}
        <br />
        <small>
          {t("Szczegóły", "Details")}: {error.code ?? ""} {error.message}
        </small>
      </p>
    );
  }

  const orders: Map<string, SaleOrder> = await listSaleOrders(id).catch(() => new Map());
  const cash = (n: number) => money(n, lang, n % 1 !== 0);
  // Złożone zamówienia na górze, potem pozostałe wybory
  const rows = ((data ?? []) as Row[]).sort((a, b) => Number(orders.has(b.id)) - Number(orders.has(a.id)));
  const statusLabel = (o: SaleOrder) =>
    o.status === "delivered"
      ? t("Zdjęcia udostępnione", "Photos delivered")
      : o.status === "paid"
        ? t("Opłacone", "Paid")
        : o.total > 0
          ? t("Czeka na wpłatę", "Awaiting payment")
          : t("Do udostępnienia", "To deliver");
  const byName = new Map(photos.map((p) => [p.name, p]));

  if (rows.length === 0) {
    return (
      <div className="empty-state">
        {selling && <p className="hint-inline">{t("Sprzedaż zdjęć jest włączona – zamówienia klientów pojawią się tutaj.", "Photo sales are on – client orders will appear here.")}</p>}
        <p>{t("Nikt jeszcze nie wybrał ulubionych zdjęć.", "No one has picked favourite photos yet.")}</p>
        <p className="hint-inline">{t("Klient zaznacza serduszkiem zdjęcia w galerii, a jego wybór pojawi się tutaj.", "Your client marks photos with a heart in the gallery, and the selection appears here.")}</p>
      </div>
    );
  }

  return (
    <div className="selections">
      {rows.map((r) => {
        const o = orders.get(r.id);
        const items = (o?.photos ?? r.photos).map((n) => byName.get(n)).filter((p): p is NonNullable<typeof p> => Boolean(p));
        return (
          <article key={r.id} className="settings-card selection">
            <header className="selection-head">
              <div>
                <h2>{r.client_name}</h2>
                <p className="hint-inline">
                  {r.client_email && (
                    <>
                      <a href={`mailto:${r.client_email}`}>{r.client_email}</a> ·{" "}
                    </>
                  )}
                  {items.length} {items.length === 1 ? t("zdjęcie", "photo") : t("zdjęć", "photos")} · {t("zmiana", "updated")} {fmt.format(new Date(r.updated_at))}
                </p>
              </div>
              <SelectionActions galleryId={id} selectionId={r.id} name={r.client_name} fileNames={items.map((p) => p.fileName)} />
            </header>
            {o && (
              <div className="order-box">
                <p>
                  <span className={`order-status ${o.status}`}>{statusLabel(o)}</span>
                  {t("Zamówienie", "Order")} {o.ref}
                  {" · "}
                  {o.total > 0 ? `${t("do zapłaty", "to pay")} ${cash(o.total)}` : t("bez dopłaty", "no extra payment")}
                  <small>
                    {o.photos.length} {t("zdjęć", "photos")}
                    {o.included > 0 && ` · ${Math.min(o.photos.length, o.included)} ${t("w pakiecie", "included")}`}
                    {o.extra > 0 && ` · ${o.extra} × ${cash(o.extraPrice)}`}
                    {o.total > 0 && ` · ${t("tytuł przelewu kończy się na", "transfer title ends with")} ${o.ref}`}
                  </small>
                </p>
                <OrderActions galleryId={id} selection={r.id} status={o.status} total={o.total} />
              </div>
            )}
            {r.note && <blockquote className="selection-note">{r.note}</blockquote>}
            {items.length > 0 ? (
              <ul className="selection-grid">
                {items.map((p) => (
                  <li key={p.name} title={p.fileName}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={p.fileName} loading="lazy" />
                    <span>{p.fileName}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="hint-inline">{t("Brak zaznaczonych zdjęć.", "No photos selected.")}</p>
            )}
          </article>
        );
      })}
    </div>
  );
}
