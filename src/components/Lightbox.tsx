"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type LightboxItem = { url: string; name: string; downloadUrl?: string };

// Pełnoekranowy podgląd zdjęć: strzałki, klawiatura, przesuwanie palcem i powiększanie
export default function Lightbox({
  items,
  index,
  onClose,
  onIndex,
}: {
  items: LightboxItem[];
  index: number;
  onClose: () => void;
  onIndex: (i: number) => void;
}) {
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const [loaded, setLoaded] = useState(false);
  const touchX = useRef<number | null>(null);
  const item = items[index];

  const go = useCallback(
    (dir: number) => {
      if (items.length < 2) return;
      setZoom(false);
      setLoaded(false);
      onIndex((index + dir + items.length) % items.length);
    },
    [index, items.length, onIndex],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [go, onClose]);

  // Wczytujemy z wyprzedzeniem sąsiednie zdjęcia, żeby przewijanie było płynne
  useEffect(() => {
    for (const d of [1, -1]) {
      const next = items[(index + d + items.length) % items.length];
      if (next) {
        const img = new Image();
        img.src = next.url;
      }
    }
  }, [index, items]);

  if (!item) return null;

  function toggleZoom(e: React.MouseEvent<HTMLImageElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setOrigin(`${x}% ${y}%`);
    setZoom((z) => !z);
  }

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`Zdjęcie ${index + 1} z ${items.length}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchX.current === null || zoom) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
    >
      <div className="lb-top">
        <span className="lb-count">
          {index + 1} / {items.length}
        </span>
        <div className="lb-tools">
          {item.downloadUrl && (
            <a className="lb-btn" href={item.downloadUrl} download aria-label="Pobierz zdjęcie" title="Pobierz">
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path d="M12 4v11m0 0-4-4m4 4 4-4M5 19h14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          )}
          <button type="button" className="lb-btn" onClick={() => setZoom((z) => !z)} aria-label={zoom ? "Pomniejsz" : "Powiększ"} title={zoom ? "Pomniejsz" : "Powiększ"}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d={zoom ? "M8.5 11h5M20 20l-4.5-4.5" : "M8.5 11h5M11 8.5v5M20 20l-4.5-4.5"} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <button type="button" className="lb-btn" onClick={onClose} aria-label="Zamknij" title="Zamknij">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      <div className={zoom ? "lb-stage zoomed" : "lb-stage"}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={item.url}
          src={item.url}
          alt={item.name}
          className={loaded ? "lb-img ready" : "lb-img"}
          style={{ transformOrigin: origin }}
          onLoad={() => setLoaded(true)}
          onClick={toggleZoom}
          draggable={false}
        />
      </div>

      {items.length > 1 && (
        <>
          <button type="button" className="lb-nav lb-prev" onClick={() => go(-1)} aria-label="Poprzednie zdjęcie">
            <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button type="button" className="lb-nav lb-next" onClick={() => go(1)} aria-label="Następne zdjęcie">
            <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
              <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </>
      )}

      <p className="lb-name">{item.name}</p>
    </div>
  );
}
