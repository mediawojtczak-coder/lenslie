"use client";

import { useEffect, useRef, useState } from "react";

// Przycisk „Pobierz” z wyborem: pełna rozdzielczość albo lżejsza wersja do internetu
export default function DownloadMenu({
  fullUrl,
  webUrl,
  fileName,
  variant = "tile",
}: {
  // Bez pełnej rozdzielczości przycisk od razu pobiera wersję do internetu
  fullUrl?: string;
  webUrl: string;
  fileName: string;
  variant?: "tile" | "lightbox";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  if (!fullUrl) {
    return (
      <div className={`dl-menu dl-${variant}`}>
        <a
          href={webUrl}
          download
          data-track="download"
          data-photo={fileName}
          className={variant === "tile" ? "pa-btn" : "lb-btn"}
          aria-label={`Pobierz ${fileName}`}
          title="Pobierz"
        >
          <svg viewBox="0 0 24 24" width={variant === "tile" ? 22 : 20} height={variant === "tile" ? 22 : 20} aria-hidden="true">
            <path d="M12 4v11m0 0-4-4m4 4 4-4M5 19h14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {variant === "tile" && <span>Pobierz</span>}
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
        aria-label={`Pobierz ${fileName}`}
        title="Pobierz"
      >
        <svg viewBox="0 0 24 24" width={variant === "tile" ? 22 : 20} height={variant === "tile" ? 22 : 20} aria-hidden="true">
          <path d="M12 4v11m0 0-4-4m4 4 4-4M5 19h14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {variant === "tile" && <span>Pobierz</span>}
      </button>

      {open && (
        <div className="dl-pop" role="menu">
          <a role="menuitem" href={fullUrl} download data-track="download" data-photo={fileName} onClick={() => setOpen(false)}>
            <strong>Pełna rozdzielczość</strong>
            <span>Oryginał do druku i albumu</span>
          </a>
          <a role="menuitem" href={webUrl} download data-track="download" data-photo={fileName} onClick={() => setOpen(false)}>
            <strong>Do internetu</strong>
            <span>Mniejszy plik na Facebooka, Instagram</span>
          </a>
        </div>
      )}
    </div>
  );
}
