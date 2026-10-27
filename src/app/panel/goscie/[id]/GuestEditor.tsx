"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { useLang } from "@/components/LangProvider";
import { tr, money, locale } from "@/lib/lang";
import PayButtons from "@/components/PayButtons";
import InvoiceFields from "@/components/InvoiceFields";
import DownloadAll from "@/app/galeria/[id]/DownloadAll";
import type { Billing } from "@/lib/billing";

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
  price,
  limitGb,
  used,
  balance,
  billing,
  photos,
}: {
  event: Ev;
  status: "active" | "draft" | "expired";
  expiresAt: string | null;
  deleteOn: string | null;
  publicUrl: string;
  price: number;
  limitGb: number;
  used: number;
  balance: number;
  billing: Billing;
  photos: P[];
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
    QRCode.toDataURL(publicUrl, { width: 640, margin: 1, color: { dark: "#3b3633", light: "#ffffff" } }).then(setQr).catch(() => setQr(""));
  }, [publicUrl]);

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

      <section className="settings-card qr-panel">
        <h2>{t("Kod QR na stoły", "QR code for the tables")}</h2>
        <div className="qr-panel-row">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt={t("Kod QR do strony gości", "QR code to the guest page")} className="qr-img" />
          ) : (
            <div className="qr-img qr-empty" />
          )}
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
        <div className="gu-wall-head">
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
        {photos.length === 0 ? (
          <p className="hint-inline">{t("Goście nie dodali jeszcze zdjęć.", "Guests haven't added any photos yet.")}</p>
        ) : (
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
