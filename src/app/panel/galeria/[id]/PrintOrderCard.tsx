"use client";

import { useState } from "react";
import { useLang } from "@/components/LangProvider";
import { tr, money } from "@/lib/lang";
import PayButtons from "@/components/PayButtons";
import InvoiceFields from "@/components/InvoiceFields";
import type { Billing } from "@/lib/billing";
import { albumFormat, type AlbumProject } from "@/lib/album-layout";
import { PRINT_BASE, PRINT_EXTRA_PAGE, PRINT_FORMATS, PRINT_MARKUP, PRINT_MAX_PAGES, PRINT_SHIPPING, printPages, printPrice } from "@/lib/print-prices";

type Photo = { name: string; url: string };

// Zamówienie wydrukowanego albumu z projektu: pliki z oryginałów, wysyłka InPost do paczkomatu
export default function PrintOrderCard({
  galleryId,
  project,
  photos,
  balance,
  billing,
  saving,
  onFormat,
}: {
  galleryId: string;
  project: AlbumProject;
  photos: Photo[];
  balance: number;
  billing: Billing;
  saving: boolean;
  onFormat: (size: string) => void;
}) {
  const lang = useLang();
  const t = (pl: string, en: string) => tr(lang, pl, en);
  const fmt = albumFormat(project.size);
  const printable = PRINT_FORMATS.includes(fmt.id);
  const pages = printPages(project.spreads.length);
  const price = printable ? printPrice(fmt.id, pages) : null;
  const tooLong = pages > PRINT_MAX_PAGES;

  const [open, setOpen] = useState(false);
  const [copies, setCopies] = useState(1);
  const [ship, setShip] = useState({ name: "", phone: "", email: "", locker: "" });
  const [invoice, setInvoice] = useState<Billing>(billing);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState("");
  const [error, setError] = useState("");
  const total = price ? price.album * copies + PRINT_SHIPPING : 0;

  async function api(body: Record<string, unknown>) {
    const res = await fetch("/api/album-print", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Error");
    return data;
  }

  async function order(pay: "wallet" | "p24") {
    setBusy(true);
    setError("");
    try {
      setStep(t("Przygotowuję zamówienie…", "Preparing the order…"));
      const prep = await api({ action: "prepare", gallery: galleryId, shipping: ship, copies });
      // pliki do druku z oryginałów – generowane w tej przeglądarce i wysyłane do Lenslie
      const { exportAlbum } = await import("@/lib/album-render");
      const fallback = Object.fromEntries(photos.map((p) => [p.name, p.url]));
      const zip = await exportAlbum(project, prep.urls ?? {}, fallback, (d, n) => setStep(`${t("Przygotowuję rozkładówki", "Rendering spreads")} ${d}/${n}…`), "album");
      setStep(t("Wysyłam pliki do drukarni…", "Uploading files…"));
      const put = await fetch(prep.upload, { method: "PUT", body: zip, headers: { "Content-Type": "application/zip" } });
      if (!put.ok) throw new Error(t("Nie udało się wysłać plików albumu. Spróbuj jeszcze raz.", "Could not upload the album files. Please try again."));
      setStep(t("Przechodzę do płatności…", "Redirecting to payment…"));
      const paid = await api({ action: "pay", order: prep.order, pay, invoice });
      if (paid.redirect) {
        window.location.href = paid.redirect;
        return;
      }
      setStep("");
      setOpen(false);
      setError("");
      alertDone();
    } catch (err) {
      setStep("");
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  const [done, setDone] = useState(false);
  const alertDone = () => setDone(true);
  const set = (k: keyof typeof ship) => (e: React.ChangeEvent<HTMLInputElement>) => setShip({ ...ship, [k]: e.target.value });
  const priceFor = (f: string) => (PRINT_BASE[f] ?? 0) * PRINT_MARKUP;

  return (
    <section className="settings-card prn">
      <div className="prn-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/album/druk-hero.jpg" alt="" className="prn-img" />
        <div className="prn-copy">
          <p className="fs-kicker">{t("Druk albumu", "Album printing")}</p>
          <h2>{t("Wspomnienia, które żyją", "Memories that live on")}</h2>
          <p className="hint-inline">
            {t(
              "Zamów ten album wydrukowany – w twardej oprawie, na grubym papierze fotograficznym. Pliki przygotujemy z oryginałów zdjęć, a gotowy album przyjedzie InPostem do wybranego paczkomatu.",
              "Order this album printed – hardcover, on thick photo paper. We prepare the files from your original photos and the finished album arrives by InPost to the parcel locker you choose.",
            )}
          </p>
          <ul className="prn-prices">
            {PRINT_FORMATS.map((f) => (
              <li key={f} className={fmt.id === f ? "on" : ""}>
                <span>{f.replace("x", "×")} cm</span>
                <strong>{money(priceFor(f), lang)}</strong>
              </li>
            ))}
          </ul>
          <p className="prn-note">
            {t(
              `Cena za 20 stron · każda kolejna strona ${money(PRINT_EXTRA_PAGE * PRINT_MARKUP, lang)} (do ${PRINT_MAX_PAGES} stron) · wysyłka InPost ${money(PRINT_SHIPPING, lang)} · czas realizacji do 12 dni roboczych`,
              `Price for 20 pages · each extra page ${money(PRINT_EXTRA_PAGE * PRINT_MARKUP, lang)} (up to ${PRINT_MAX_PAGES} pages) · InPost delivery ${money(PRINT_SHIPPING, lang)} · lead time up to 12 working days`,
            )}
          </p>
        </div>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/album/druk-detale.jpg" alt="" className="prn-details" />

      {done ? (
        <p className="success-box">
          {t(
            "Dziękujemy! Zamówienie przyjęte – potwierdzenie wysłaliśmy mailem. Czas realizacji: do 12 dni roboczych.",
            "Thank you! Your order has been placed – we've sent a confirmation by e-mail. Lead time: up to 12 working days.",
          )}
        </p>
      ) : !printable ? (
        <div className="warn-inline prn-warn">
          {t("Druk zamówisz w formacie 15×15, 20×20 albo 25×25 cm. Zmień format projektu:", "Printing is available in 15×15, 20×20 or 25×25 cm. Change the design size:")}{" "}
          {PRINT_FORMATS.map((f) => (
            <button key={f} type="button" className="as-link" onClick={() => onFormat(f)}>
              {f.replace("x", "×")} cm
            </button>
          ))}
        </div>
      ) : tooLong ? (
        <p className="warn-inline">
          {t(
            `Album do druku może mieć najwyżej ${PRINT_MAX_PAGES} stron, a projekt ma ${pages}. Wybierz mniejszą liczbę stron i wygeneruj go ponownie.`,
            `A printed album can have at most ${PRINT_MAX_PAGES} pages; the design has ${pages}. Choose fewer pages and generate it again.`,
          )}
        </p>
      ) : !open ? (
        <div className="prn-cta">
          <div>
            <strong>
              {fmt.w}×{fmt.h} cm · {pages} {t(pages % 10 >= 2 && pages % 10 <= 4 && (pages % 100 < 12 || pages % 100 > 14) ? "strony" : "stron", "pages")}
            </strong>
            <span>
              {money(price!.album, lang)} + {t("wysyłka", "delivery")} {money(PRINT_SHIPPING, lang)}
            </span>
            {project.spreads.length * 2 < pages && (
              <small>{t(`Projekt ma ${project.spreads.length * 2} stron – brakujące będą puste.`, `The design has ${project.spreads.length * 2} pages – the rest will be blank.`)}</small>
            )}
          </div>
          <button type="button" className="btn btn-dark" onClick={() => setOpen(true)}>
            {t("Zamów wydrukowany album", "Order the printed album")}
          </button>
        </div>
      ) : (
        <div className="prn-form">
          <div className="prn-row">
            <label>
              {t("Liczba egzemplarzy", "Copies")}
              <select className="plain-select" value={copies} onChange={(e) => setCopies(Number(e.target.value))}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="field-title">{t("Wysyłka InPost do paczkomatu", "InPost parcel locker delivery")}</p>
          <div className="invoice-grid">
            <label>
              {t("Imię i nazwisko odbiorcy", "Recipient name")}
              <input value={ship.name} onChange={set("name")} autoComplete="name" />
            </label>
            <label>
              {t("Telefon (kod odbioru)", "Phone (pickup code)")}
              <input value={ship.phone} onChange={set("phone")} inputMode="tel" autoComplete="tel" placeholder="600 000 000" />
            </label>
            <label>
              E-mail
              <input value={ship.email} onChange={set("email")} type="email" autoComplete="email" />
            </label>
            <label>
              {t("Kod paczkomatu", "Locker code")}
              <input value={ship.locker} onChange={set("locker")} placeholder="np. KRA01M" />
            </label>
          </div>
          <p className="hint-inline">
            <a href="https://inpost.pl/znajdz-paczkomat" target="_blank" rel="noreferrer">
              {t("Znajdź paczkomat na mapie InPost ›", "Find a locker on the InPost map ›")}
            </a>
          </p>
          <InvoiceFields value={invoice} onChange={setInvoice} />
          <div className="prn-sum">
            <span>
              {t("Album", "Album")} {fmt.w}×{fmt.h} cm, {pages} {t("str.", "p.")}
              {copies > 1 ? ` × ${copies}` : ""}
            </span>
            <span>{money(price!.album * copies, lang)}</span>
            <span>{t("Wysyłka InPost", "InPost delivery")}</span>
            <span>{money(PRINT_SHIPPING, lang)}</span>
            <span>{t("Czas realizacji", "Lead time")}</span>
            <span>{t("do 12 dni roboczych", "up to 12 working days")}</span>
            <strong>{t("Razem", "Total")}</strong>
            <strong>{money(total, lang)}</strong>
          </div>
          {step && <p className="hint-inline">{step}</p>}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <PayButtons price={total} balance={balance} busy={busy} disabled={saving} label={t("i zamów", "and order")} onPay={order} />
          <button type="button" className="as-link" disabled={busy} onClick={() => setOpen(false)}>
            {t("Anuluj", "Cancel")}
          </button>
          <p className="prn-note">
            {t(
              "Album drukujemy dokładnie tak, jak wygląda projekt powyżej. Sprawdź kolejność rozkładówek i kadry przed zamówieniem – po opłaceniu nie można go zmienić.",
              "We print the album exactly as the design above. Check the spread order and crops before ordering – it can't be changed after payment.",
            )}
          </p>
        </div>
      )}
    </section>
  );
}
