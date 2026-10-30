"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/components/LangProvider";
import { tr, money } from "@/lib/lang";
import PayButtons from "@/components/PayButtons";
import InvoiceFields from "@/components/InvoiceFields";
import { readDuration, uploadVideo, type VideoUpload } from "@/lib/video-upload";
import type { Billing } from "@/lib/billing";

export type VideoRow = {
  id: string;
  name: string;
  size: number;
  duration: number;
  status: "uploading" | "unpaid" | "processing" | "ready" | "error";
  price?: number;
  months?: number;
  thumbnail?: string;
};

const fmtSize = (b: number) => (b >= 1024 ** 3 ? `${(b / 1024 ** 3).toFixed(1)} GB` : `${Math.max(1, Math.round(b / 1024 ** 2))} MB`);
const fmtDur = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.round(s % 60);
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
};

// Filmy w galerii: wgrywanie oryginału, cena po wgraniu, płatność, stan przygotowania podglądu
export default function VideoManager({
  id,
  videos,
  published,
  balance,
  billing,
  pro = false,
}: {
  id: string;
  videos: VideoRow[];
  published: boolean;
  balance: number;
  billing: Billing;
  pro?: boolean; // galeria w abonamencie Pro: filmy bez opłat (liczone do puli miejsca)
}) {
  const lang = useLang();
  const t = (pl: string, en: string) => tr(lang, pl, en);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const jobRef = useRef<VideoUpload | null>(null);
  const [current, setCurrent] = useState<{ name: string; progress: number; left: number; sent?: number; total?: number; resumed?: boolean } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [invoice, setInvoice] = useState<Billing>(billing);
  const endpoint = `/api/galleries/${id}/videos`;

  const unpaid = videos.filter((v) => v.status === "unpaid");
  const total = unpaid.reduce((s, v) => s + (v.price ?? 0), 0);
  const processing = videos.some((v) => v.status === "processing");

  // Gdy Stream przygotowuje podgląd – odświeżamy co 20 sekund
  useEffect(() => {
    if (!processing) return;
    const timer = setInterval(() => router.refresh(), 20000);
    return () => clearInterval(timer);
  }, [processing, router]);

  // Ostrzeżenie przed zamknięciem karty w trakcie wgrywania
  useEffect(() => {
    if (!current) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [current]);

  async function add(list: FileList | null) {
    const files = [...(list ?? [])].filter((f) => f.type.startsWith("video/") || /\.(mp4|mov|m4v|avi|mkv|mts|webm)$/i.test(f.name));
    if (inputRef.current) inputRef.current.value = "";
    if (files.length === 0) return;
    setError("");
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setCurrent({ name: file.name, progress: 0, left: files.length - i - 1 });
      try {
        const duration = await readDuration(file);
        const job = uploadVideo(endpoint, file, duration, (p) =>
          setCurrent((c) => (c ? { ...c, progress: p.fraction, sent: p.sent, total: p.total, resumed: p.resumed } : c)),
        );
        jobRef.current = job;
        await job.done;
      } catch (err) {
        if (!(err instanceof Error && err.message === "abort")) setError(err instanceof Error ? err.message : t("Nie udało się wgrać filmu.", "Could not upload the video."));
        break;
      } finally {
        jobRef.current = null;
        router.refresh();
      }
    }
    setCurrent(null);
  }

  async function call(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Error");
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

  const label = (v: VideoRow) =>
    v.status === "unpaid"
      ? `${t("Do opłacenia", "To pay")} · ${money(v.price ?? 0, lang)}`
      : v.status === "processing"
        ? t("Przygotowuję podgląd…", "Preparing preview…")
        : v.status === "ready"
          ? t("Widoczny w galerii", "Visible in gallery")
          : v.status === "error"
            ? t("Błąd podglądu – oryginał jest bezpieczny", "Preview error – the original is safe")
            : t("Wgrywanie przerwane – wybierz ten plik ponownie, aby dokończyć", "Upload interrupted – choose this file again to finish");

  return (
    <section className="settings-card video-card">
      <div className="gu-admin-head">
        <h2 style={{ margin: 0 }}>{t("Filmy", "Videos")}</h2>
        {published && (
          <button type="button" className="btn btn-small" onClick={() => inputRef.current?.click()} disabled={Boolean(current) || busy}>
            {t("Dodaj film", "Add video")}
          </button>
        )}
      </div>
      <p className="hint-inline">
        {published && pro
          ? t(
              "Film w oryginalnej jakości do pobrania i lekki podgląd do oglądania – na samej górze galerii. W abonamencie Pro filmy są w cenie do limitu godzin pakietu, a ich rozmiar wlicza się do miejsca na Twoje galerie.",
              "The original-quality video for download plus a light preview for watching – at the very top of the gallery. With Pro, videos are included up to your plan's hour limit and their size counts towards your storage.",
            )
          : published
          ? t(
              "Film w oryginalnej jakości do pobrania i podgląd do oglądania – na samej górze galerii. Filmy są w cenie galerii, bez dopłat – liczą się tylko do miejsca w pakiecie (GB), razem ze zdjęciami.",
              "The original-quality video for download plus a preview for watching – at the very top of the gallery. Videos are included in the gallery price at no extra cost – they only count towards the plan's storage (GB), together with photos.",
            )
          : t("Opublikuj galerię, aby dodać do niej film.", "Publish the gallery to add a video.")}
      </p>
      <input ref={inputRef} type="file" accept="video/*,.mov,.mp4,.m4v,.mts,.mkv" multiple hidden onChange={(e) => add(e.target.files)} />

      {current && (
        <div className="video-up" aria-live="polite">
          <div className="video-up-line">
            <span className="video-name">{current.name}</span>
            <span>
              {current.total ? `${fmtSize(current.sent ?? 0)} / ${fmtSize(current.total)} · ` : ""}
              {(current.total ?? 0) > 2 * 1024 ** 3 ? (current.progress * 100).toFixed(1) : Math.round(current.progress * 100)}%
            </span>
          </div>
          <div className="up-total">
            <span style={{ width: `${Math.max(2, Math.round(current.progress * 100))}%` }} />
          </div>
          <div className="video-up-line">
            <small>
              {current.resumed && `${t("Wznowiono – wgrane części są pomijane.", "Resumed – uploaded parts are skipped.")} `}
              {t(
                "Nie zamykaj tej karty i nie usypiaj komputera do końca wgrywania.",
                "Keep this tab open and don't let the computer sleep until the upload finishes.",
              )}
              {current.left > 0 && ` ${t("W kolejce", "Queued")}: ${current.left}.`}
            </small>
            <button type="button" className="as-link" onClick={() => jobRef.current?.cancel()}>
              {t("Anuluj", "Cancel")}
            </button>
          </div>
        </div>
      )}

      {videos.length > 0 && (
        <ul className="video-list">
          {videos.map((v) => (
            <li key={v.id} className={`video-row ${v.status}`}>
              <div className="video-thumb">
                {v.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.thumbnail} alt="" />
                ) : (
                  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                    <path d="M9 7.5v9l7.5-4.5z" fill="currentColor" />
                  </svg>
                )}
              </div>
              <div className="video-info">
                <strong className="video-name">{v.name}</strong>
                <small>
                  {fmtSize(v.size)}
                  {v.duration > 1 && ` · ${fmtDur(v.duration)}`}
                  {v.months && v.status === "unpaid" ? ` · ${t("do końca galerii", "until the gallery ends")} (${v.months} ${t("mies.", "mo.")})` : ""}
                </small>
              </div>
              <span className={`order-status ${v.status === "ready" ? "delivered" : v.status === "processing" ? "paid" : ""}`}>{label(v)}</span>
              <button
                type="button"
                className="as-link danger"
                disabled={busy || Boolean(current)}
                onClick={() =>
                  window.confirm(
                    v.status === "unpaid"
                      ? t("Usunąć ten film?", "Delete this video?")
                      : t("Usunąć film z galerii? Opłata nie jest zwracana.", "Remove the video from the gallery? The fee is not refunded."),
                  ) && call({ action: "delete", videoId: v.id })
                }
              >
                {t("Usuń", "Delete")}
              </button>
            </li>
          ))}
        </ul>
      )}

      {unpaid.length > 0 && !current && (
        <div className="video-pay">
          <p>
            {t("Do zapłaty za filmy", "To pay for videos")}: <strong>{money(total, lang)}</strong>
          </p>
          <p className="hint-inline">
            {t(
              "Cena obejmuje przechowanie oryginału, przygotowanie podglądu i oglądanie przez gości do końca dostępu do galerii. Przy przedłużeniu galerii filmy przedłużają się razem z nią.",
              "The price covers storing the original, preparing the preview and viewing until the gallery access ends. When you extend the gallery, videos are extended with it.",
            )}
          </p>
          <InvoiceFields value={invoice} onChange={setInvoice} />
          <PayButtons price={total} balance={balance} busy={busy} label={t("za filmy", "for videos")} onPay={(pay) => call({ action: "pay", pay, invoice })} />
        </div>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
