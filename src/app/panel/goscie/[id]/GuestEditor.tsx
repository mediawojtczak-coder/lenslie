"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FancyQr, { qrPng } from "@/components/FancyQr";
import { useLang } from "@/components/LangProvider";
import { tr, money, locale } from "@/lib/lang";
import PayButtons from "@/components/PayButtons";
import InvoiceFields from "@/components/InvoiceFields";
import DownloadAll from "@/app/galeria/[id]/DownloadAll";
import type { Billing } from "@/lib/billing";
import { canvasToJpeg } from "@/lib/watermark-client";

type Ev = { id: string; title: string; date: string; welcome: string; lang: "pl" | "en"; showWall: boolean; allowDownload: boolean };
type P = { name: string; url: string; downloadUrl: string; webDownloadUrl: string; fileName: string; webFileName: string };

async function api(body: Record<string, unknown>) {
  const res = await fetch("/api/guest-events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Error");
  return data;
}

const gb = (b: number) => (b / 1024 ** 3).toLocaleString("pl-PL", { maximumFractionDigits: 1 });

export default function GuestEditor({
  event,
  status,
  expiresAt,
  deleteOn,
  publicUrl,
  cover,
  price,
  limitGb,
  used,
  balance,
  billing,
  photos,
  videos = [],
}: {
  event: Ev;
  status: "active" | "draft" | "expired";
  expiresAt: string | null;
  deleteOn: string | null;
  publicUrl: string;
  cover: string | null;
  price: number;
  limitGb: number;
  used: number;
  balance: number;
  billing: Billing;
  photos: P[];
  videos?: { name: string; poster?: string; src: string; downloadUrl: string; size: number; processing: boolean }[];
}) {
  const lang = useLang();
  const t = (pl: string, en: string) => tr(lang, pl, en);
  const router = useRouter();
  const [ev, setEv] = useState(event);
  const [invoice, setInvoice] = useState<Billing>(billing);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ where: string; ok: boolean; text: string } | null>(null);
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);
  const fmt = new Intl.DateTimeFormat(locale(lang), { day: "numeric", month: "long", year: "numeric" });

  useEffect(() => {
    qrPng(publicUrl).then(setQr).catch(() => setQr(""));
  }, [publicUrl]);

  // Okładka: zmniejszamy w przeglądarce do 2400 px i wysyłamy prosto do magazynu
  async function uploadCover(file?: File) {
    if (!file) return;
    setBusy("cover");
    setMsg(null);
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
      const scale = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bmp.width * scale);
      canvas.height = Math.round(bmp.height * scale);
      canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
      const blob = await canvasToJpeg(canvas);
      const { url } = await api({ id: ev.id, action: "cover-url" });
      const put = await fetch(url, { method: "PUT", body: blob, headers: { "Content-Type": "image/jpeg" } });
      if (!put.ok) throw new Error(t("Nie udało się przesłać zdjęcia.", "Could not upload the photo."));
      await api({ id: ev.id, action: "cover-done" });
      router.refresh();
    } catch (err) {
      setMsg({ where: "cover", ok: false, text: err instanceof Error ? err.message : "Error" });
    } finally {
      setBusy("");
    }
  }

  async function run(where: string, body: Record<string, unknown>, ok?: string) {
    setBusy(where);
    setMsg(null);
    try {
      const data = await api({ id: ev.id, ...body });
      if (data.redirect) {
        window.location.href = data.redirect;
        return true;
      }
      if (ok) setMsg({ where, ok: true, text: ok });
      router.refresh();
      return true;
    } catch (err) {
      setMsg({ where, ok: false, text: err instanceof Error ? err.message : "Error" });
      return false;
    } finally {
      setBusy("");
    }
  }

  const note = (where: string) =>
    msg?.where === where ? (
      <p className={msg.ok ? "success" : "error"} role={msg.ok ? undefined : "alert"}>
        {msg.text}
      </p>
    ) : null;

  return (
    <div className="settings">
      {status === "draft" ? (
        <section className="settings-card">
          <h2>{t("Aktywuj galerię gości", "Activate the guest gallery")}</h2>
          <p>
            {t(
              `Jednorazowo ${money(price, lang)}: goście dodają i oglądają zdjęcia przez rok, do ${limitGb} GB. Po roku masz jeszcze 30 dni na pobranie wszystkiego.`,
              `One-off ${money(price, lang)}: guests upload and view photos for a year, up to ${limitGb} GB. After a year you have 30 more days to download everything.`,
            )}
          </p>
          <InvoiceFields value={invoice} onChange={setInvoice} />
          {note("pay")}
          <PayButtons
            price={price}
            balance={balance}
            busy={busy === "pay"}
            label={t("i aktywuj", "and activate")}
            onPay={(pay) => run("pay", { action: "pay", pay, invoice }, t("Galeria gości jest aktywna.", "The guest gallery is active."))}
          />
        </section>
      ) : (
        <section className="share-bar">
          <div className="share-status">
            <span className={status === "active" ? "dot" : "dot dot-off"} aria-hidden="true" />
            <div>
              <p className="share-label">{status === "active" ? t("Galeria gości aktywna", "Guest gallery active") : t("Wydarzenie wygasło", "Event expired")}</p>
              <p className="share-note">
                {status === "active" && expiresAt
                  ? `${t("Goście mogą dodawać zdjęcia do", "Guests can upload until")} ${fmt.format(new Date(expiresAt))}`
                  : deleteOn
                    ? `${t("Pobierz zdjęcia – usuniemy je", "Download the photos – they will be deleted on")} ${fmt.format(new Date(deleteOn))}`
                    : ""}
              </p>
            </div>
          </div>
          <div className="share-actions">
            <a href={publicUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-small">
              {t("Otwórz stronę gości", "Open guest page")}
            </a>
          </div>
        </section>
      )}

      <section className="settings-card">
        <h2>{t("Zdjęcie na okładkę", "Cover photo")}</h2>
        <div className="qr-panel-row">
          <div className="gu-cover-prev">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover} alt="" />
            ) : (
              <span>{t("Brak okładki", "No cover")}</span>
            )}
          </div>
          <div>
            <p>{t("Np. portret pary z sesji narzeczeńskiej. Goście zobaczą je na całą szerokość ekranu, z imionami pary na zdjęciu.", "E.g. a portrait of the couple from the engagement shoot. Guests see it full-width with the couple's names on top.")}</p>
            <div className="order-actions">
              <label className="btn btn-small gu-file">
                {busy === "cover" ? t("Przesyłam…", "Uploading…") : cover ? t("Zmień zdjęcie", "Change photo") : t("Dodaj zdjęcie", "Add photo")}
                <input type="file" accept="image/*" hidden disabled={Boolean(busy)} onChange={(e) => uploadCover(e.target.files?.[0])} />
              </label>
              {cover && (
                <button type="button" className="as-link" disabled={Boolean(busy)} onClick={() => run("cover", { action: "cover-remove" })}>
                  {t("Usuń", "Remove")}
                </button>
              )}
            </div>
            {note("cover")}
          </div>
        </div>
      </section>

      <section className="settings-card qr-panel">
        <h2>{t("Kod QR na stoły", "QR code for the tables")}</h2>
        <div className="qr-panel-row">
          <FancyQr text={publicUrl} className="qr-img qc-qr" label={t("Kod QR do strony gości", "QR code to the guest page")} />
          <div>
            <p>{t("Goście skanują kod aparatem w telefonie i od razu dodają zdjęcia – bez aplikacji i logowania.", "Guests scan the code with their phone camera and add photos right away – no app, no login.")}</p>
            <p className="share-sub">{t("Link dla gości", "Guest link")}</p>
            <a href={publicUrl} target="_blank" rel="noreferrer" className="share-url">
              {publicUrl}
            </a>
            <div className="order-actions">
              <a className="btn btn-small" href={`/panel/goscie/${ev.id}/druk`}>
                {t("Kartki na stoły do druku", "Printable table cards")}
              </a>
              {qr && (
                <a className="btn btn-ghost btn-small" href={qr} download={`${ev.id}-kod-qr.png`}>
                  {t("Pobierz kod QR", "Download QR code")}
                </a>
              )}
              <button
                type="button"
                className="as-link"
                onClick={async () => {
                  await navigator.clipboard.writeText(publicUrl).catch(() => undefined);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? t("Skopiowano", "Copied") : t("Kopiuj link", "Copy link")}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="settings-card">
        <div className="gu-admin-head">
          <h2 style={{ margin: 0 }}>
            {t("Zdjęcia gości", "Guest photos")} <span className="side-count">{photos.length}</span>
          </h2>
          {photos.length > 0 && (
            <DownloadAll
              items={photos.map((p) => ({ url: p.downloadUrl, fileName: p.fileName, webUrl: p.webDownloadUrl, webFileName: p.webFileName }))}
              zipName={`${ev.id}.zip`}
              lang={lang}
            />
          )}
        </div>
        <p className="hint-inline">
          {gb(used)} {t("z", "of")} {limitGb} GB
        </p>
        {videos.length > 0 && (
          <ul className="video-list">
            {videos.map((v) => (
              <li key={v.name} className="video-row">
                <div className="video-thumb">
                  {v.poster ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.poster} alt="" />
                  ) : (
                    <video src={`${v.src}#t=0.5`} preload="metadata" muted playsInline />
                  )}
                </div>
                <div className="video-info">
                  <strong className="video-name">{t("Film od gościa", "Guest video")}</strong>
                  <small>
                    {v.size >= 1024 ** 3 ? `${(v.size / 1024 ** 3).toFixed(1)} GB` : `${Math.max(1, Math.round(v.size / 1024 ** 2))} MB`}
                    {v.processing && ` · ${t("przygotowuję podgląd…", "preparing preview…")}`}
                  </small>
                </div>
                <a className="as-link" href={v.downloadUrl}>
                  {t("Pobierz", "Download")}
                </a>
                <button
                  type="button"
                  className="as-link danger"
                  disabled={Boolean(busy)}
                  onClick={() => window.confirm(t("Usunąć ten film?", "Delete this video?")) && run("photos", { action: "delete-video", name: v.name })}
                >
                  {t("Usuń", "Delete")}
                </button>
              </li>
            ))}
          </ul>
        )}
        {photos.length === 0 && videos.length === 0 ? (
          <p className="hint-inline">{t("Goście nie dodali jeszcze zdjęć ani filmów.", "Guests haven't added any photos or videos yet.")}</p>
        ) : photos.length === 0 ? null : (
          <div className="gu-grid">
            {photos.map((p) => (
              <figure key={p.name} className="gu-tile gu-admin">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" loading="lazy" />
                <button
                  type="button"
                  className="photo-del"
                  aria-label={t("Usuń zdjęcie", "Delete photo")}
                  title={t("Usuń zdjęcie", "Delete photo")}
                  disabled={Boolean(busy)}
                  onClick={() => window.confirm(t("Usunąć to zdjęcie?", "Delete this photo?")) && run("photos", { action: "delete-photo", name: p.name })}
                >
                  ×
                </button>
              </figure>
            ))}
          </div>
        )}
        {note("photos")}
      </section>

      <form
        className="settings-card"
        onSubmit={(e) => {
          e.preventDefault();
          run("settings", { action: "save", ...ev }, t("Zapisano.", "Saved."));
        }}
      >
        <h2>{t("Strona dla gości", "Guest page")}</h2>
        <label htmlFor="ge-title">{t("Nazwa", "Name")}</label>
        <input id="ge-title" value={ev.title} maxLength={100} onChange={(e) => setEv({ ...ev, title: e.target.value })} required />
        <div className="sale-fields">
          <div>
            <label htmlFor="ge-date">{t("Data wydarzenia", "Event date")}</label>
            <input id="ge-date" type="date" value={ev.date} onChange={(e) => setEv({ ...ev, date: e.target.value })} />
          </div>
          <div>
            <label htmlFor="ge-lang">{t("Język strony gości", "Guest page language")}</label>
            <select id="ge-lang" className="plain-select" value={ev.lang} onChange={(e) => setEv({ ...ev, lang: e.target.value as "pl" | "en" })}>
              <option value="pl">Polski</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
        <label htmlFor="ge-welcome">{t("Powitanie", "Welcome text")}</label>
        <textarea
          id="ge-welcome"
          rows={3}
          maxLength={1000}
          value={ev.welcome}
          onChange={(e) => setEv({ ...ev, welcome: e.target.value })}
          placeholder={t("np. Podzielcie się z nami zdjęciami z naszego dnia! Anna i Marek", "e.g. Share your photos from our day with us! Anna & Mark")}
        />
        <label className="check">
          <input type="checkbox" checked={ev.showWall} onChange={(e) => setEv({ ...ev, showWall: e.target.checked })} />
          {t("Goście widzą zdjęcia innych gości", "Guests can see other guests' photos")}
        </label>
        <label className="check">
          <input type="checkbox" checked={ev.allowDownload} onChange={(e) => setEv({ ...ev, allowDownload: e.target.checked })} />
          {t("Goście mogą pobierać zdjęcia", "Guests can download photos")}
        </label>
        {note("settings")}
        <button type="submit" className="btn" disabled={busy === "settings"}>
          {busy === "settings" ? t("Zapisuję…", "Saving…") : t("Zapisz", "Save")}
        </button>
      </form>

      <div className="settings-card danger">
        <h2>{t("Usuń wydarzenie", "Delete event")}</h2>
        <p>{t("Usuwa stronę gości i wszystkie dodane zdjęcia. Opłata nie jest zwracana.", "Deletes the guest page and all uploaded photos. The fee is not refunded.")}</p>
        {note("delete")}
        <button
          type="button"
          className="btn btn-danger"
          disabled={Boolean(busy)}
          onClick={async () => {
            if (!window.confirm(t(`Usunąć „${event.title}” ze wszystkimi zdjęciami?`, `Delete “${event.title}” with all photos?`))) return;
            if (await run("delete", { action: "delete" })) router.push("/panel/goscie");
          }}
        >
          {t("Usuń wydarzenie", "Delete event")}
        </button>
      </div>
    </div>
  );
}
