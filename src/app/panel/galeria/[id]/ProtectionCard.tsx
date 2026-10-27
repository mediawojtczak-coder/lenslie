"use client";

import { useTr } from "@/components/LangProvider";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { watermarkFromUrl } from "@/lib/watermark-client";

type Downloads = "all" | "web" | "none";


// Ochrona zdjęć: co klient może pobrać i znak wodny
export default function ProtectionCard({
  id,
  downloads: initialDownloads,
  watermark: initialWm,
  wmMissing,
  photoCount,
}: {
  id: string;
  downloads: Downloads;
  watermark: { enabled: boolean; text: string };
  wmMissing: string[];
  photoCount: number;
}) {
  const router = useRouter();
  const t = useTr();
  const OPTIONS: { value: Downloads; title: string; desc: string }[] = [
    { value: "all", title: t("Wszystko", "Everything"), desc: t("Pełna rozdzielczość i wersje do internetu", "Full resolution and web versions") },
    { value: "web", title: t("Tylko do internetu", "Web only"), desc: t("Mniejsze pliki, bez oryginałów do druku", "Smaller files, no print originals") },
    { value: "none", title: t("Bez pobierania", "No downloads"), desc: t("Klient tylko ogląda, np. do czasu zapłaty", "Client can only view, e.g. until payment") },
  ];
  const [downloads, setDownloads] = useState(initialDownloads);
  const [enabled, setEnabled] = useState(initialWm.enabled);
  const [text, setText] = useState(initialWm.text);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Nakłada znak wodny na wskazane zdjęcia – robi to ta przeglądarka, po kilka naraz
  async function applyWatermark(names: string[], wmText: string) {
    setProgress({ done: 0, total: names.length });
    let done = 0;
    for (let start = 0; start < names.length; start += 30) {
      const res = await fetch(`/api/galleries/${id}/protection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "wm-urls", names: names.slice(start, start + 30) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("Nie udało się nałożyć znaku wodnego.", "Could not apply the watermark."));
      const items: { name: string; src: string; put: string }[] = data.items;
      let next = 0;
      const worker = async () => {
        while (next < items.length) {
          const it = items[next++];
          const blob = await watermarkFromUrl(it.src, wmText);
          const put = await fetch(it.put, { method: "PUT", body: blob, headers: { "Content-Type": "image/jpeg" } });
          if (!put.ok) throw new Error(t("Nie udało się zapisać zdjęcia ze znakiem wodnym.", "Could not save the watermarked photo."));
          done += 1;
          setProgress({ done, total: names.length });
        }
      };
      await Promise.all([worker(), worker(), worker()]);
    }
    setProgress(null);
  }

  async function save() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (enabled && !text.trim()) throw new Error(t("Wpisz tekst znaku wodnego, np. nazwę studia.", "Enter the watermark text, e.g. your studio name."));
      const res = await fetch(`/api/galleries/${id}/protection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", downloads, watermark: { enabled, text } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("Nie udało się zapisać.", "Could not save."));
      if (data.regenerate?.length) await applyWatermark(data.regenerate, text.trim());
      setMessage(t("Zapisano.", "Saved."));
      router.refresh();
    } catch (err) {
      setProgress(null);
      setError(err instanceof Error ? err.message : t("Nie udało się zapisać.", "Could not save."));
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    setBusy(true);
    setError("");
    try {
      await applyWatermark(wmMissing, initialWm.text);
      setMessage(t("Znak wodny jest na wszystkich zdjęciach.", "The watermark is on all photos."));
      router.refresh();
    } catch (err) {
      setProgress(null);
      setError(err instanceof Error ? err.message : t("Nie udało się nałożyć znaku wodnego.", "Could not apply the watermark."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="settings-card">
      <h2>{t("Ochrona zdjęć", "Photo protection")}</h2>

      <p className="field-title">{t("Co klient może pobrać", "What your client can download")}</p>
      <div className="option-list">
        {OPTIONS.map((o) => (
          <label key={o.value} className={downloads === o.value ? "option active" : "option"}>
            <input type="radio" name="downloads" checked={downloads === o.value} onChange={() => setDownloads(o.value)} />
            <span>
              <strong>{o.title}</strong>
              <small>{o.desc}</small>
            </span>
          </label>
        ))}
      </div>

      <label className="check">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        {t("Znak wodny na zdjęciach w galerii klienta", "Watermark on photos in the client gallery")}
      </label>
      {enabled && (
        <>
          <label htmlFor="wm-text">{t("Tekst znaku wodnego", "Watermark text")}</label>
          <input
            id="wm-text"
            value={text}
            maxLength={60}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("np. © Anna Nowak Fotografia", "e.g. © Anna Smith Photography")}
          />
        </>
      )}
      <p className="hint">
        {t("Znak wodny trafia na podgląd i wersje do internetu. Oryginały w pełnej rozdzielczości zostają czyste, dlatego przy znaku wodnym zwykle wybiera się „Tylko do internetu” albo „Bez pobierania”.", "The watermark goes on previews and web versions. Full-resolution originals stay clean, so with a watermark you usually pick “Web only” or “No downloads”.")}
      </p>

      {initialWm.enabled && wmMissing.length > 0 && !progress && (
        <p className="warn-inline">
          {t("Znak wodny nie jest jeszcze nałożony na", "The watermark is not yet applied to")} {wmMissing.length} {t("z", "of")} {photoCount} {t("zdjęć", "photos")}.{" "}
          <button type="button" className="as-link" onClick={finish} disabled={busy}>
            {t("Dokończ teraz", "Finish now")}
          </button>
        </p>
      )}

      {progress && (
        <div className="wm-progress" aria-live="polite">
          <p>
            {t("Nakładam znak wodny", "Applying watermark")}: {progress.done} {t("z", "of")} {progress.total}. {t("Nie zamykaj tej strony.", "Do not close this page.")}
          </p>
          <div className="progress">
            <div className="bar" style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} />
          </div>
        </div>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {message && <p className="success">{message}</p>}

      <button type="button" className="btn" onClick={save} disabled={busy}>
        {busy ? t("Zapisuję…", "Saving…") : t("Zapisz ochronę zdjęć", "Save photo protection")}
      </button>
    </div>
  );
}
