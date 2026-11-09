"use client";

import { useEffect, useRef, useState } from "react";
import { T, type Lang } from "@/lib/i18n";
import { canSaveToPhone, cachedPhoto, loadPhoto, sharePhoto } from "@/lib/save-photo";

// Przycisk „Pobierz” z wyborem: pełna rozdzielczość albo lżejsza wersja do internetu
export default function DownloadMenu({
  fullUrl,
  webUrl,
  fileName,
  variant = "tile",
  lang = "pl",
}: {
  // Bez pełnej rozdzielczości przycisk od razu pobiera wersję do internetu
  fullUrl?: string;
  webUrl: string;
  fileName: string;
  variant?: "tile" | "lightbox";
  lang?: Lang;
}) {
  const t = T[lang];
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // telefon: jedno dotknięcie = zapis do galerii zdjęć (systemowe „Zapisz obraz”)
  const [phone, setPhone] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "ready">("idle");
  useEffect(() => setPhone(canSaveToPhone()), []);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  if (phone) {
    const url = fullUrl ?? webUrl;
    const size = variant === "tile" ? 22 : 20;
    async function save() {
      const ready = cachedPhoto(url);
      if (ready) {
        const r = await sharePhoto(ready);
        setState(r === "needs-tap" ? "ready" : "idle");
        if (r === "failed") window.location.href = url;
        return;
      }
      if (state === "loading") return;
      setState("loading");
      try {
        const file = await loadPhoto(url, fileName);
        const r = await sharePhoto(file);
        setState(r === "needs-tap" ? "ready" : "idle");
        if (r === "failed") window.location.href = url;
      } catch {
        // plik nie dał się pobrać w tle – zwykłe pobieranie jak dotąd
        setState("idle");
        window.location.href = url;
      }
    }
    const label = state === "ready" ? t.tapToSave : t.saveToPhone;
    return (
      <div className={`dl-menu dl-${variant}`}>
        <button
          type="button"
          className={`${variant === "tile" ? "pa-btn" : "lb-btn"}${state === "loading" ? " dl-busy" : ""}${state === "ready" ? " dl-ready" : ""}`}
          onClick={save}
          data-track={state === "ready" ? undefined : "download"}
          data-photo={fileName}
          aria-label={`${label}: ${fileName}`}
          aria-busy={state === "loading"}
          title={label}
        >
          {state === "loading" ? (
            <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className="dl-spin">
              <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeOpacity=".25" strokeWidth="1.6" />
              <path d="M12 4a8 8 0 0 1 8 8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
              <path d="M12 4v11m0 0-4-4m4 4 4-4M5 19h14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {variant === "tile" && <span>{state === "ready" ? t.tapToSave : t.download}</span>}
          {variant === "lightbox" && state === "ready" && <span className="dl-ready-tip">{t.tapToSave}</span>}
        </button>
      </div>
    );
  }

  if (!fullUrl) {
    return (
      <div className={`dl-menu dl-${variant}`}>
        <a
          href={webUrl}
          download
          data-track="download"
          data-photo={fileName}
          className={variant === "tile" ? "pa-btn" : "lb-btn"}
          aria-label={`${t.download} ${fileName}`}
          title={t.download}
        >
          <svg viewBox="0 0 24 24" width={variant === "tile" ? 22 : 20} height={variant === "tile" ? 22 : 20} aria-hidden="true">
            <path d="M12 4v11m0 0-4-4m4 4 4-4M5 19h14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {variant === "tile" && <span>{t.download}</span>}
        </a>
      </div>
    );
  }

  return (
    <div ref={ref} className={`dl-menu dl-${variant}`}>
      <button
        type="button"
        className={variant === "tile" ? "pa-btn" : "lb-btn"}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${t.download} ${fileName}`}
        title={t.download}
      >
        <svg viewBox="0 0 24 24" width={variant === "tile" ? 22 : 20} height={variant === "tile" ? 22 : 20} aria-hidden="true">
          <path d="M12 4v11m0 0-4-4m4 4 4-4M5 19h14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {variant === "tile" && <span>{t.download}</span>}
      </button>

      {open && (
        <div className="dl-pop" role="menu">
          <a role="menuitem" href={fullUrl} download data-track="download" data-photo={fileName} onClick={() => setOpen(false)}>
            <strong>{t.full}</strong>
            <span>{t.fullDescOne}</span>
          </a>
          <a role="menuitem" href={webUrl} download data-track="download" data-photo={fileName} onClick={() => setOpen(false)}>
            <strong>{t.web}</strong>
            <span>{t.webDescOne}</span>
          </a>
        </div>
      )}
    </div>
  );
}
