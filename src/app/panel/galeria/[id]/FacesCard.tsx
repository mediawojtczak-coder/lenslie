"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/components/LangProvider";
import { tr, money } from "@/lib/lang";
import PayButtons from "@/components/PayButtons";
import InvoiceFields from "@/components/InvoiceFields";
import { indexPhotos } from "@/lib/faces-client";
import type { Billing } from "@/lib/billing";

// „Znajdź siebie na zdjęciach”: zakup, przygotowanie indeksu twarzy (w przeglądarce fotografa), wyłączenie
export default function FacesCard({
  id,
  faces,
  photos,
  price,
  balance,
  billing,
}: {
  id: string;
  faces: { enabled: boolean; paid?: boolean; indexed?: number } | null;
  photos: { name: string; url: string }[];
  price: number;
  balance: number;
  billing: Billing;
}) {
  const lang = useLang();
  const t = (pl: string, en: string) => tr(lang, pl, en);
  const router = useRouter();
  const [consent, setConsent] = useState(false);
  const [invoice, setInvoice] = useState<Billing>(billing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const stop = useRef(false);
  const indexed = faces?.indexed ?? 0;

  async function api(body: Record<string, unknown>) {
    const res = await fetch(`/api/galleries/${id}/faces`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Error");
    return data;
  }

  async function buy(pay: "wallet" | "p24") {
    setBusy(true);
    setError("");
    try {
      const data = await api({ action: "buy", consent, pay, invoice });
      if (data.redirect) {
        window.location.href = data.redirect;
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  // Indeksuje tylko zdjęcia, których jeszcze nie ma w indeksie (nowe po dograniu)
  async function prepare() {
    setBusy(true);
    setError("");
    stop.current = false;
    try {
      const { get, put } = await api({ action: "index-urls" });
      let existing: Record<string, number[][]> = {};
      if (get) {
        const r = await fetch(get);
        if (r.ok) existing = (await r.json()).photos ?? {};
      }
      const current = new Set(photos.map((p) => p.name));
      for (const k of Object.keys(existing)) if (!current.has(k)) delete existing[k];
      const todo = photos.filter((p) => !(p.name in existing));
      setProgress({ done: 0, total: todo.length });
      const fresh = await indexPhotos(todo, (done, total) => setProgress({ done, total }), () => stop.current);
      const merged = { ...existing, ...fresh };
      const res = await fetch(put, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ v: 1, photos: merged }) });
      if (!res.ok) throw new Error(t("Nie udało się zapisać danych.", "Could not save the data."));
      await api({ action: "index-done", count: Object.keys(merged).length });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error && err.message !== "img" ? err.message : t("Rozpoznawanie twarzy nie działa w tej przeglądarce. Spróbuj w Chrome.", "Face recognition doesn't work in this browser. Try Chrome."));
    } finally {
      setProgress(null);
      setBusy(false);
    }
  }

  return (
    <div className="settings-card" id="twarze">
      <h2>{t("Znajdź siebie na zdjęciach", "Find yourself in the photos")}</h2>
      <p>
        {t(
          "Klient i goście robią selfie, a galeria pokazuje tylko zdjęcia, na których są. Idealne przy weselach i eventach z setkami zdjęć.",
          "Your client and guests take a selfie and the gallery shows only the photos they're in. Perfect for weddings and events with hundreds of photos.",
        )}
      </p>

      {!faces?.paid ? (
        <>
          <label className="check">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            {t(
              "Potwierdzam, że osoby na zdjęciach (np. goście wesela) zostały poinformowane o rozpoznawaniu twarzy i mam podstawę do przetwarzania tych danych (np. ich zgodę). Opisy twarzy usuwamy razem z galerią.",
              "I confirm the people in the photos (e.g. wedding guests) have been informed about face recognition and I have a legal basis to process this data (e.g. their consent). Face data is deleted together with the gallery.",
            )}
          </label>
          <p className="hint-inline">
            {money(price, lang)} {t("jednorazowo za tę galerię.", "one-off for this gallery.")}
          </p>
          <InvoiceFields value={invoice} onChange={setInvoice} />
          <PayButtons price={price} balance={balance} busy={busy} disabled={!consent} label={t("i włącz", "and turn on")} onPay={buy} />
        </>
      ) : (
        <>
          <p className="hint-inline">
            {faces.enabled
              ? `${t("Przygotowane zdjęcia", "Prepared photos")}: ${Math.min(indexed, photos.length)} ${t("z", "of")} ${photos.length}.`
              : t("Funkcja jest wyłączona, a opisy twarzy usunięte.", "The feature is off and face data has been deleted.")}{" "}
            {faces.enabled && indexed > 0 && t("Przycisk „Znajdź siebie” jest widoczny w galerii.", "The “Find me” button is visible in the gallery.")}
          </p>
          {progress ? (
            <div className="video-up" aria-live="polite">
              <div className="video-up-line">
                <span>{t("Rozpoznaję twarze na zdjęciach…", "Recognising faces in the photos…")}</span>
                <span>
                  {progress.done} / {progress.total}
                </span>
              </div>
              <div className="up-total">
                <span style={{ width: `${Math.round((progress.done / Math.max(1, progress.total)) * 100)}%` }} />
              </div>
              <div className="video-up-line">
                <small>{t("Działa w Twojej przeglądarce – nie zamykaj tej karty. Ok. 1 s na zdjęcie.", "Runs in your browser – keep this tab open. About 1 s per photo.")}</small>
                <button type="button" className="as-link" onClick={() => (stop.current = true)}>
                  {t("Zatrzymaj", "Stop")}
                </button>
              </div>
            </div>
          ) : (
            <div className="order-actions">
              {faces.enabled && indexed < photos.length && (
                <button type="button" className="btn btn-small" disabled={busy} onClick={prepare}>
                  {indexed === 0 ? t("Przygotuj wyszukiwanie", "Prepare search") : t(`Dodaj nowe zdjęcia (${photos.length - indexed})`, `Add new photos (${photos.length - indexed})`)}
                </button>
              )}
              <button
                type="button"
                className="as-link"
                disabled={busy}
                onClick={async () => {
                  if (faces.enabled && !window.confirm(t("Wyłączyć i usunąć opisy twarzy?", "Turn off and delete face data?"))) return;
                  setBusy(true);
                  await api({ action: "toggle" }).catch((e) => setError(e.message));
                  setBusy(false);
                  router.refresh();
                }}
              >
                {faces.enabled ? t("Wyłącz i usuń dane twarzy", "Turn off and delete face data") : t("Włącz ponownie", "Turn on again")}
              </button>
            </div>
          )}
        </>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
