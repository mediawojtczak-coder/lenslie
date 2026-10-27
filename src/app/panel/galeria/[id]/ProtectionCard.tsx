"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { watermarkFromUrl } from "@/lib/watermark-client";

type Downloads = "all" | "web" | "none";

const OPTIONS: { value: Downloads; title: string; desc: string }[] = [
  { value: "all", title: "Wszystko", desc: "Pełna rozdzielczość i wersje do internetu" },
  { value: "web", title: "Tylko do internetu", desc: "Mniejsze pliki, bez oryginałów do druku" },
  { value: "none", title: "Bez pobierania", desc: "Klient tylko ogląda, np. do czasu zapłaty" },
];

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
      if (!res.ok) throw new Error(data.error ?? "Nie udało się nałożyć znaku wodnego.");
      const items: { name: string; src: string; put: string }[] = data.items;
      let next = 0;
      const worker = async () => {
        while (next < items.length) {
          const it = items[next++];
          const blob = await watermarkFromUrl(it.src, wmText);
          const put = await fetch(it.put, { method: "PUT", body: blob, headers: { "Content-Type": "image/jpeg" } });
          if (!put.ok) throw new Error("Nie udało się zapisać zdjęcia ze znakiem wodnym.");
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
      if (enabled && !text.trim()) throw new Error("Wpisz tekst znaku wodnego, np. nazwę studia.");
      const res = await fetch(`/api/galleries/${id}/protection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", downloads, watermark: { enabled, text } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Nie udało się zapisać.");
      if (data.regenerate?.length) await applyWatermark(data.regenerate, text.trim());
      setMessage("Zapisano.");
      router.refresh();
    } catch (err) {
      setProgress(null);
      setError(err instanceof Error ? err.message : "Nie udało się zapisać.");
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    setBusy(true);
    setError("");
    try {
      await applyWatermark(wmMissing, initialWm.text);
      setMessage("Znak wodny jest na wszystkich zdjęciach.");
      router.refresh();
    } catch (err) {
      setProgress(null);
      setError(err instanceof Error ? err.message : "Nie udało się nałożyć znaku wodnego.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="settings-card">
      <h2>Ochrona zdjęć</h2>

      <p className="field-title">Co klient może pobrać</p>
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
        Znak wodny na zdjęciach w galerii klienta
      </label>
      {enabled && (
        <>
          <label htmlFor="wm-text">Tekst znaku wodnego</label>
          <input
            id="wm-text"
            value={text}
            maxLength={60}
            onChange={(e) => setText(e.target.value)}
            placeholder="np. © Anna Nowak Fotografia"
          />
        </>
      )}
      <p className="hint">
        Znak wodny trafia na podgląd i wersje do internetu. Oryginały w pełnej rozdzielczości zostają czyste, dlatego
        przy znaku wodnym zwykle wybiera się „Tylko do internetu” albo „Bez pobierania”.
      </p>

      {initialWm.enabled && wmMissing.length > 0 && !progress && (
        <p className="warn-inline">
          Znak wodny nie jest jeszcze nałożony na {wmMissing.length} z {photoCount} zdjęć.{" "}
          <button type="button" className="as-link" onClick={finish} disabled={busy}>
            Dokończ teraz
          </button>
        </p>
      )}

      {progress && (
        <div className="wm-progress" aria-live="polite">
          <p>
            Nakładam znak wodny: {progress.done} z {progress.total}. Nie zamykaj tej strony.
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
        {busy ? "Zapisuję…" : "Zapisz ochronę zdjęć"}
      </button>
    </div>
  );
}
