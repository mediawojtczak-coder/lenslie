import { getUser } from "@/lib/supabase/server";
import SelectionActions from "./SelectionActions";
import OrderActions from "./OrderActions";
import ReplaceEdited from "./ReplaceEdited";
import ClientLink from "./ClientLink";
import { siteUrl } from "@/lib/email";
import { listSaleOrders, type SaleOrder } from "@/lib/sales";
import { money } from "@/lib/lang";
import { fmtCur, type Cur } from "@/lib/foreign-prices";
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
  edited = [],
}: {
  id: string;
  selling?: boolean;
  edited?: string[];
  photos: { name: string; fileName: string; url: string; dl: string }[];
}) {
  const { supabase } = await getUser();
  const lang = await getLang();
  const t = (pl: string, en: string) => tr(lang, pl, en);
  const fmt = new Intl.DateTimeFormat(locale(lang), { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Warsaw" });
  // wybory klientów (Supabase) i zamówienia (R2) czytamy naraz, a nie jedno po drugim
  const [{ data, error }, orders] = await Promise.all([
    supabase
      .from("selections")
      .select("id, client_name, client_email, photos, note, updated_at")
      .eq("gallery_id", id)
      .order("updated_at", { ascending: false }),
    listSaleOrders(id).catch(() => new Map<string, SaleOrder>()),
  ]);

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

  const cash = (n: number, cur?: Cur) => (cur ? fmtCur(n, cur) : money(n, lang, n % 1 !== 0));
  // Złożone zamówienia na górze, potem pozostałe wybory
  const rows = ((data ?? []) as Row[]).sort((a, b) => Number(orders.has(b.id)) - Number(orders.has(a.id)));
  const statusLabel = (o: SaleOrder) =>
    o.status === "delivered"
      ? o.paidBy === "card"
        ? t("Opłacone kartą – zdjęcia udostępnione", "Paid by card – photos delivered")
        : t("Zdjęcia udostępnione", "Photos delivered")
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
              <SelectionActions galleryId={id} selectionId={r.id} name={r.client_name} fileNames={items.map((p) => p.fileName)} files={items.map((p) => ({ url: p.dl, fileName: p.fileName }))} />
            </header>
            {o && (
              <div className="order-box">
                <div className="ob-top">
                  <div className="ob-title">
                    <span className={`order-status ${o.status}`}>{statusLabel(o)}</span>
                    <b>
                      {t("Zamówienie", "Order")} {o.ref}
                    </b>
                  </div>
                  <div className="ob-sum">
                    <strong>{o.total > 0 ? cash(o.total, o.cur) : t("bez dopłaty", "no extra payment")}</strong>
                    {o.total > 0 && <span>{o.status === "ordered" ? t("do zapłaty", "to pay") : t("opłacone", "paid")}</span>}
                  </div>
                </div>
                <dl className="ob-facts">
                  <div>
                    <dt>{t("Zdjęcia", "Photos")}</dt>
                    <dd>{o.photos.length}</dd>
                  </div>
                  {o.deliveredPhotos?.length ? (
                    <div>
                      <dt>{t("Już udostępnione", "Already delivered")}</dt>
                      <dd>{o.deliveredPhotos.length}</dd>
                    </div>
                  ) : o.included > 0 ? (
                    <div>
                      <dt>{t("W pakiecie", "Included")}</dt>
                      <dd>{Math.min(o.photos.length, o.included)}</dd>
                    </div>
                  ) : null}
                  {o.extra > 0 && (
                    <div>
                      <dt>{t("Dodatkowe", "Extra")}</dt>
                      <dd>
                        {o.extra} × {cash(o.extraPrice, o.cur)}
                      </dd>
                    </div>
                  )}
                  {o.total > 0 && !o.cur && (
                    <div>
                      <dt>{t("Tytuł przelewu", "Transfer title")}</dt>
                      <dd>…{o.ref}</dd>
                    </div>
                  )}
                </dl>
                <div className="ob-bottom">
                  <OrderActions galleryId={id} selection={r.id} status={o.status} total={o.total} />
                  <ClientLink url={`${siteUrl()}/galeria/${id}/moje/${r.id}`} />
                </div>
              </div>
            )}
            {items.length > 0 && <ReplaceEdited galleryId={id} photos={items.map((p) => ({ name: p.name, fileName: p.fileName }))} edited={edited} />}
            {r.note && <blockquote className="selection-note">{r.note}</blockquote>}
            {items.length > 0 ? (
              <ul className="selection-grid">
                {items.map((p) => (
                  <li key={p.name} title={p.fileName} className={edited.includes(p.name) ? "is-edited" : undefined}>
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
