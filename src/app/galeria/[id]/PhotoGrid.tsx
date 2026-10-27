"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Lightbox from "@/components/Lightbox";
import DownloadMenu from "@/components/DownloadMenu";
import DownloadAll from "./DownloadAll";
import { T, type Lang } from "@/lib/i18n";
import { money } from "@/lib/lang";
import type { Payout, OrderStatus } from "@/lib/sales";
import type { ZipItem } from "@/lib/zip-client";

export type GridItem = {
  name: string;
  fileName: string;
  webUrl: string;
  // Brak linku = to pobieranie jest wyłączone przez fotografa
  downloadUrl?: string;
  webDownloadUrl?: string;
  webFileName: string;
  // Znak wodny jeszcze się nakłada – pokazujemy nakładkę z napisem
  wmPending?: boolean;
  // Zdjęcie z dostarczonego zamówienia – bez znaku wodnego, do pobrania
  unlocked?: boolean;
};

// Galeria ze sprzedażą zdjęć: pakiet, zamówienie klienta i dane do wpłaty
export type SaleInfo = {
  included: number;
  extraPrice: number;
  title: string;
  payout: Payout | null;
  order: { status: OrderStatus; total: number; extra: number; count: number; ref: string } | null;
  delivered: ZipItem[];
};

function Check({ on, size = 20 }: { on: boolean; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" />
      <path d="M8.3 12.3l2.5 2.5 4.9-5.2" fill="none" stroke={on ? "#fff" : "currentColor"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export type Group = { id: string; name: string | null; photos: GridItem[] };

export type Favorites = { name: string | null; photos: string[] };

function Heart({ on, size = 20 }: { on: boolean; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path
        d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"
        fill={on ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Zdjęcia galerii u klienta: sekcje z menu, pobieranie sekcji, podgląd i pokaz slajdów
export default function PhotoGrid({
  groups,
  layout,
  zipBase,
  musicUrl,
  downloads = "all",
  watermark,
  galleryId,
  favorites,
  sale = null,
  limit = null,
  lang = "pl",
}: {
  groups: Group[];
  layout: "mozaika" | "siatka";
  zipBase: string;
  musicUrl?: string | null;
  downloads?: "all" | "web" | "none";
  watermark?: string | null;
  galleryId?: string;
  // Ulubione: null = funkcja wyłączona (np. link dla gości)
  favorites?: Favorites | null;
  sale?: SaleInfo | null;
  // Limit wyboru ulubionych, np. 60 zdjęć do albumu
  limit?: { max: number; label: string } | null;
  lang?: Lang;
}) {
  const [toast, setToast] = useState("");
  const limitMax = !sale && limit && limit.max > 0 ? limit.max : 0;
  const t = T[lang];
  const [order, setOrder] = useState(sale?.order ?? null);
  const locked = Boolean(order);
  const Mark = sale ? Check : Heart;
  const L = sale
    ? { add: t.pick, remove: t.unpick, name: t.picked, showOnly: t.showPicked, none: t.noPicked }
    : { add: t.addFav, remove: t.removeFav, name: t.favorites, showOnly: t.showFavs, none: t.noFavs };
  const cash = (n: number) => money(n, lang, n % 1 !== 0);
  const orderRef = useRef<HTMLDialogElement>(null);
  const payRef = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");
  const [favs, setFavs] = useState<Set<string>>(new Set(favorites?.photos ?? []));
  const [who, setWho] = useState<string | null>(favorites?.name ?? null);
  const [onlyFavs, setOnlyFavs] = useState(false);
  // Pasek ulubionych pokazujemy dopiero przy zdjęciach, nie na okładce
  const [pastCover, setPastCover] = useState(false);
  useEffect(() => {
    const check = () => {
      const bar = document.getElementById("zdjecia");
      setPastCover(bar ? bar.getBoundingClientRect().top < window.innerHeight * 0.5 : true);
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, []);
  const [pending, setPending] = useState<string | null>(null);
  const [favError, setFavError] = useState("");
  const startRef = useRef<HTMLDialogElement>(null);
  const sendRef = useRef<HTMLDialogElement>(null);

  const shownGroups = useMemo(
    () => (onlyFavs ? groups.map((g) => ({ ...g, photos: g.photos.filter((p) => favs.has(p.name)) })) : groups),
    [groups, onlyFavs, favs],
  );
  const all = useMemo(() => shownGroups.flatMap((g) => g.photos), [shownGroups]);
  const [open, setOpen] = useState<number | null>(null);
  const [autoplay, setAutoplay] = useState(false);
  const named = shownGroups.filter((g) => g.name && g.photos.length > 0);

  async function favApi(body: Record<string, unknown>) {
    const res = await fetch(`/api/galleries/${galleryId}/selection`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error ?? t.saveError) as Error & { code?: string };
      err.code = data.code;
      throw err;
    }
    return data;
  }

  async function toggleFav(name: string) {
    if (!favorites || locked) return;
    if (!who) {
      setPending(name);
      setFavError("");
      startRef.current?.showModal();
      return;
    }
    if (limitMax && !favs.has(name) && favs.size >= limitMax) {
      setToast(t.limitReached(limitMax));
      setTimeout(() => setToast(""), 3500);
      return;
    }
    // Od razu zmieniamy serduszko, a serwer potwierdza w tle
    setFavs((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
    try {
      const data = await favApi({ action: "toggle", photo: name });
      setFavs(new Set(data.photos));
    } catch (err) {
      if ((err as { code?: string }).code === "LIMIT") {
        setFavs((prev) => {
          const next = new Set(prev);
          next.delete(name);
          return next;
        });
        setToast(t.limitReached(limitMax));
        setTimeout(() => setToast(""), 3500);
      }
      if ((err as { code?: string }).code === "NO_SELECTION") {
        setWho(null);
        setFavs(new Set());
      }
    }
  }

  async function startSelection(form: HTMLFormElement) {
    const fd = new FormData(form);
    setFavError("");
    try {
      const data = await favApi({ action: "start", name: fd.get("name"), email: fd.get("email") });
      setWho(data.name);
      startRef.current?.close();
      if (pending) {
        const p = pending;
        setPending(null);
        setFavs(new Set([p]));
        const res = await favApi({ action: "toggle", photo: p });
        setFavs(new Set(res.photos));
      }
    } catch (err) {
      setFavError(err instanceof Error ? err.message : t.saveError);
    }
  }

  const extra = sale ? Math.max(0, favs.size - sale.included) : 0;
  const extraSum = sale ? Math.round(extra * sale.extraPrice * 100) / 100 : 0;

  async function placeOrder(form: HTMLFormElement) {
    const fd = new FormData(form);
    setFavError("");
    setBusy(true);
    try {
      const data = await favApi({ action: "order", note: fd.get("note") });
      setOrder(data.order);
      orderRef.current?.close();
      if (data.order.total > 0) payRef.current?.showModal();
    } catch (err) {
      setFavError(err instanceof Error ? err.message : t.orderError);
    } finally {
      setBusy(false);
    }
  }

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(""), 1800);
    } catch {
      /* zaznaczenie ręczne */
    }
  }

  const [sent, setSent] = useState("");
  async function sendSelection(form: HTMLFormElement) {
    const fd = new FormData(form);
    setFavError("");
    try {
      await favApi({ action: "note", note: fd.get("note"), notify: true });
      setSent(t.sentThanks);
    } catch (err) {
      setFavError(err instanceof Error ? err.message : t.sendError);
    }
  }

  // Przycisk „Pokaz slajdów” na górnym pasku galerii
  useEffect(() => {
    const start = () => {
      setAutoplay(true);
      setOpen(0);
    };
    window.addEventListener("lenslie:slideshow", start);
    return () => window.removeEventListener("lenslie:slideshow", start);
  }, []);

  const openAt = (photo: GridItem) => {
    setAutoplay(false);
    setOpen(all.indexOf(photo));
  };

  return (
    <>
      {named.length > 1 && (
        <nav className="section-nav" aria-label={t.sections}>
          {shownGroups
            .filter((g) => g.photos.length > 0)
            .map((g) => (
              <a key={g.id} href={`#sekcja-${g.id}`}>
                {g.name ?? t.other}
              </a>
            ))}
        </nav>
      )}

      {sale && (
        <section className="sale-card" aria-live="polite">
          {order?.status === "delivered" ? (
            <>
              <div>
                <h2>{t.readyTitle}</h2>
                <p>{t.readyLead(sale.delivered.length)}</p>
              </div>
              <div className="sale-card-actions">
                <button type="button" className="as-link" onClick={() => setOnlyFavs((v) => !v)}>
                  {onlyFavs ? t.showAll : t.showMine}
                </button>
                <DownloadAll items={sale.delivered} zipName={`${zipBase}-moje-zdjecia.zip`} label={t.downloadMine} lang={lang} />
              </div>
            </>
          ) : order ? (
            <>
              <div>
                <h2>{t.orderPlaced}</h2>
                <p>{order.status === "paid" ? t.statusPaid : order.total > 0 ? t.statusOrdered(cash(order.total)) : t.statusOrderedFree}</p>
              </div>
              {order.status === "ordered" && order.total > 0 && (
                <div className="sale-card-actions">
                  <button type="button" className="btn" onClick={() => payRef.current?.showModal()}>
                    {t.howToPay}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div>
              <h2>{t.saleTitle}</h2>
              <p>{t.saleLead(sale.included, cash(sale.extraPrice), sale.extraPrice === 0)}</p>
            </div>
          )}
        </section>
      )}

      {onlyFavs && all.length === 0 && <p className="notice">{L.none}</p>}

      {shownGroups
        .filter((g) => g.photos.length > 0)
        .map((g) => (
          <section key={g.id} id={`sekcja-${g.id}`} className="client-section" aria-label={g.name ?? t.otherPhotos}>
            {named.length > 0 && (
              <div className="section-head">
                <h2>{g.name ?? t.otherPhotos}</h2>
                {downloads !== "none" && !sale && (
                  <DownloadAll
                    small
                    label={t.downloadSection}
                    lang={lang}
                    allowFull={downloads === "all"}
                    zipName={`${zipBase}-${slug(g.name ?? "pozostale")}.zip`}
                    items={g.photos.map((p) => ({
                      url: p.downloadUrl ?? "",
                      fileName: p.fileName,
                      webUrl: p.webDownloadUrl ?? "",
                      webFileName: p.webFileName,
                    }))}
                  />
                )}
              </div>
            )}
            <div className={layout === "siatka" ? "client-grid even" : "client-grid"}>
              {g.photos.map((p) => (
                <figure key={p.name} className="photo">
                  <button type="button" className="photo-open" onClick={() => openAt(p)} aria-label={`${t.openPhoto} ${p.fileName}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.webUrl}
                      alt={p.name}
                      loading="lazy"
                      draggable={downloads !== "none" || p.unlocked}
                      onContextMenu={downloads === "none" && !p.unlocked ? (e) => e.preventDefault() : undefined}
                    />
                  </button>
                  {p.wmPending && watermark && (
                    <span className="wm-overlay" aria-hidden="true">
                      {Array.from({ length: 24 }, () => watermark).join("   ·   ")}
                    </span>
                  )}
                  {favorites && favs.has(p.name) &&
                    (locked ? (
                      <span className={sale ? "fav-mark pick" : "fav-mark"} aria-label={L.name}>
                        <Mark on size={18} />
                      </span>
                    ) : (
                      <button type="button" className={sale ? "fav-mark pick" : "fav-mark"} onClick={() => toggleFav(p.name)} aria-label={`${L.remove}: ${p.fileName}`}>
                        <Mark on size={18} />
                      </button>
                    ))}
                  <div className="photo-actions">
                    {favorites && !locked && (
                      <button
                        type="button"
                        className={favs.has(p.name) ? "pa-btn fav on" : "pa-btn fav"}
                        onClick={() => toggleFav(p.name)}
                        aria-pressed={favs.has(p.name)}
                        aria-label={`${favs.has(p.name) ? L.remove : L.add}: ${p.fileName}`}
                      >
                        <Mark on={favs.has(p.name)} size={22} />
                        <span>{sale ? (favs.has(p.name) ? t.picked : t.pick) : t.favorites}</span>
                      </button>
                    )}
                    {(downloads !== "none" || p.unlocked) && p.webDownloadUrl && (
                      <DownloadMenu
                        lang={lang}
                        fullUrl={downloads === "all" || p.unlocked ? p.downloadUrl : undefined}
                        webUrl={p.webDownloadUrl}
                        fileName={p.fileName}
                      />
                    )}
                    <button type="button" className="pa-btn" onClick={() => openAt(p)} aria-label={`${t.enlarge} ${p.fileName}`}>
                      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                        <circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M8.5 11h5M11 8.5v5M20 20l-4.5-4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      <span>{t.enlarge}</span>
                    </button>
                  </div>
                </figure>
              ))}
            </div>
          </section>
        ))}

      {open !== null && all[open] && (
        <Lightbox
          items={all.map((p) => ({
            url: p.webUrl,
            name: p.fileName,
            downloadUrl: p.downloadUrl,
            webDownloadUrl: p.webDownloadUrl,
          }))}
          index={open}
          onIndex={setOpen}
          onClose={() => {
            setOpen(null);
            setAutoplay(false);
          }}
          autoplay={autoplay}
          musicUrl={musicUrl}
          allowDownload={downloads !== "none" || all.some((p) => p.unlocked)}
          lang={lang}
          tools={
            favorites && !locked
              ? (i) => {
                  const p = all[i];
                  if (!p) return null;
                  const on = favs.has(p.name);
                  return (
                    <button
                      type="button"
                      className={on ? "lb-btn lb-fav on" : "lb-btn lb-fav"}
                      onClick={() => toggleFav(p.name)}
                      aria-pressed={on}
                      aria-label={on ? L.remove : L.add}
                      title={on ? L.remove : L.add}
                    >
                      <Mark on={on} />
                    </button>
                  );
                }
              : undefined
          }
        />
      )}

      {sale && favorites && pastCover && (favs.size > 0 || onlyFavs || locked) && (
        <div className="fav-bar sale-bar" role="region" aria-label={t.picked}>
          <span className="fav-count">
            <Check on size={16} />{" "}
            {locked ? favs.size : t.saleCount(favs.size, sale.included)}
            {!locked && extra > 0 && sale.extraPrice > 0 && <em> {t.saleExtra(extra, cash(extraSum))}</em>}
          </span>
          <button type="button" onClick={() => setOnlyFavs((v) => !v)}>
            {onlyFavs ? t.showAll : L.showOnly}
          </button>
          {!locked ? (
            <button
              type="button"
              className="fav-send"
              disabled={favs.size === 0}
              onClick={() => {
                setFavError("");
                orderRef.current?.showModal();
              }}
            >
              {t.order}
            </button>
          ) : order?.status === "ordered" && order.total > 0 ? (
            <button type="button" className="fav-send" onClick={() => payRef.current?.showModal()}>
              {t.howToPay}
            </button>
          ) : null}
        </div>
      )}

      {toast && (
        <p className="fav-toast" role="status">
          {toast}
        </p>
      )}

      {!sale && favorites && pastCover && (favs.size > 0 || onlyFavs) && (
        <div className="fav-bar" role="region" aria-label={t.favorites}>
          <span className={limitMax && favs.size >= limitMax ? "fav-count full" : "fav-count"}>
            <Heart on size={16} /> {limitMax ? `${favs.size} / ${limitMax}` : favs.size}
          </span>
          <button type="button" onClick={() => setOnlyFavs((v) => !v)}>
            {onlyFavs ? t.showAll : t.showFavs}
          </button>
          <button
            type="button"
            className="fav-send"
            onClick={() => {
              setSent("");
              setFavError("");
              sendRef.current?.showModal();
            }}
          >
            {t.sendToPhotographer}
          </button>
        </div>
      )}

      {favorites && (
        <>
          <dialog
            ref={startRef}
            className="modal"
            aria-labelledby="fav-start"
            onClick={(e) => {
              if (e.target === startRef.current) startRef.current?.close();
            }}
          >
            <form
              className="modal-body"
              onSubmit={(e) => {
                e.preventDefault();
                startSelection(e.currentTarget);
              }}
            >
              <h2 id="fav-start">{sale ? t.saleTitle : t.favTitle}</h2>
              <p className="modal-lead">
                {sale
                  ? t.saleLead(sale.included, cash(sale.extraPrice), sale.extraPrice === 0)
                  : limitMax
                    ? t.limitLead(limitMax, limit?.label ?? "")
                    : t.favLead}
              </p>
              <label htmlFor="fav-name">{t.name}</label>
              <input id="fav-name" name="name" required maxLength={80} autoComplete="given-name" autoFocus />
              <label htmlFor="fav-email">{sale ? t.emailNotify : t.emailOptional}</label>
              <input id="fav-email" name="email" type="email" maxLength={120} autoComplete="email" />
              {favError && (
                <p className="error" role="alert">
                  {favError}
                </p>
              )}
              <div className="modal-actions">
                <button type="button" className="as-link" onClick={() => startRef.current?.close()}>
                  {t.cancel}
                </button>
                <button type="submit" className="btn">
                  {t.startChoosing}
                </button>
              </div>
            </form>
          </dialog>

          <dialog
            ref={sendRef}
            className="modal"
            aria-labelledby="fav-send"
            onClick={(e) => {
              if (e.target === sendRef.current) sendRef.current?.close();
            }}
          >
            <form
              className="modal-body"
              onSubmit={(e) => {
                e.preventDefault();
                sendSelection(e.currentTarget);
              }}
            >
              <h2 id="fav-send">{t.sendTitle}</h2>
              {sent ? (
                <>
                  <p className="modal-lead">{sent}</p>
                  <div className="modal-actions">
                    <span />
                    <button type="button" className="btn" onClick={() => sendRef.current?.close()}>
                      {t.close}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="modal-lead">
                    {t.sendLead(favs.size)}
                  </p>
                  <label htmlFor="fav-note">{t.messageOptional}</label>
                  <textarea id="fav-note" name="note" rows={4} maxLength={2000} className="modal-textarea" />
                  {favError && (
                    <p className="error" role="alert">
                      {favError}
                    </p>
                  )}
                  <div className="modal-actions">
                    <button type="button" className="as-link" onClick={() => sendRef.current?.close()}>
                      {t.cancel}
                    </button>
                    <button type="submit" className="btn">
                      {t.send}
                    </button>
                  </div>
                </>
              )}
            </form>
          </dialog>
        </>
      )}

      {sale && (
        <>
          <dialog
            ref={orderRef}
            className="modal"
            aria-labelledby="sale-order"
            onClick={(e) => {
              if (e.target === orderRef.current) orderRef.current?.close();
            }}
          >
            <form
              className="modal-body"
              onSubmit={(e) => {
                e.preventDefault();
                placeOrder(e.currentTarget);
              }}
            >
              <h2 id="sale-order">{t.orderTitle}</h2>
              <dl className="sale-sum">
                <div>
                  <dt>{t.orderChosen}</dt>
                  <dd>{favs.size}</dd>
                </div>
                {sale.included > 0 && (
                  <div>
                    <dt>{t.orderIncluded}</dt>
                    <dd>{Math.min(favs.size, sale.included)}</dd>
                  </div>
                )}
                {extra > 0 && sale.extraPrice > 0 && (
                  <div>
                    <dt>{t.orderExtra}</dt>
                    <dd>
                      {extra} × {cash(sale.extraPrice)}
                    </dd>
                  </div>
                )}
                <div className="sale-total">
                  <dt>{t.orderTotal}</dt>
                  <dd>{cash(extraSum)}</dd>
                </div>
              </dl>
              <label htmlFor="sale-note">{t.messageOptional}</label>
              <textarea id="sale-note" name="note" rows={3} maxLength={2000} className="modal-textarea" />
              <p className="hint-inline">{t.orderWarn}</p>
              {favError && (
                <p className="error" role="alert">
                  {favError}
                </p>
              )}
              <div className="modal-actions">
                <button type="button" className="as-link" onClick={() => orderRef.current?.close()}>
                  {t.cancel}
                </button>
                <button type="submit" className="btn" disabled={busy || favs.size === 0}>
                  {busy ? t.ordering : t.placeOrder}
                </button>
              </div>
            </form>
          </dialog>

          <dialog
            ref={payRef}
            className="modal"
            aria-labelledby="sale-pay"
            onClick={(e) => {
              if (e.target === payRef.current) payRef.current?.close();
            }}
          >
            <div className="modal-body">
              <h2 id="sale-pay">{t.payTitle}</h2>
              <p className="modal-lead">{t.payLead}</p>
              {order && (
                <dl className="sale-sum pay">
                  <div className="sale-total">
                    <dt>{t.amount}</dt>
                    <dd>{cash(order.total)}</dd>
                  </div>
                  {sale.payout?.account && (
                    <>
                      <div>
                        <dt>{t.recipient}</dt>
                        <dd>{sale.payout.holder}</dd>
                      </div>
                      <div>
                        <dt>{t.account}</dt>
                        <dd>
                          <span className="mono">{sale.payout.account}</span>
                          <button type="button" className="as-link" onClick={() => copy(sale.payout!.account.replace(/\s/g, ""), "acc")}>
                            {copied === "acc" ? t.copied : t.copy}
                          </button>
                        </dd>
                      </div>
                      <div>
                        <dt>{t.transferTitle}</dt>
                        <dd>
                          <span>{`${sale.title.slice(0, 60)} ${order.ref}`}</span>
                          <button type="button" className="as-link" onClick={() => copy(`${sale.title.slice(0, 60)} ${order.ref}`, "title")}>
                            {copied === "title" ? t.copied : t.copy}
                          </button>
                        </dd>
                      </div>
                    </>
                  )}
                  {sale.payout?.blik && (
                    <div>
                      <dt>{t.blik}</dt>
                      <dd>
                        <span className="mono">{sale.payout.blik}</span>
                        <button type="button" className="as-link" onClick={() => copy(sale.payout!.blik.replace(/\s/g, ""), "blik")}>
                          {copied === "blik" ? t.copied : t.copy}
                        </button>
                      </dd>
                    </div>
                  )}
                </dl>
              )}
              {!sale.payout && <p className="hint-inline">{t.noPayout}</p>}
              <div className="modal-actions">
                <span />
                <button type="button" className="btn" onClick={() => payRef.current?.close()}>
                  {t.close}
                </button>
              </div>
            </div>
          </dialog>
        </>
      )}
    </>
  );
}

function slug(text: string) {
  return text
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
