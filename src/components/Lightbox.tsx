"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import DownloadMenu from "./DownloadMenu";
import { track } from "@/lib/track";

export type LightboxItem = { url: string; name: string; downloadUrl?: string; webDownloadUrl?: string };

const SLIDE_MS = 4500;

// Pełnoekranowy podgląd zdjęć: strzałki, klawiatura, przesuwanie palcem i powiększanie
export default function Lightbox({
  items,
  index,
  onClose,
  onIndex,
  autoplay = false,
  musicUrl,
  tools,
  allowDownload = true,
}: {
  items: LightboxItem[];
  index: number;
  onClose: () => void;
  onIndex: (i: number) => void;
  // Pokaz slajdów: startuje od razu, opcjonalnie z muzyką
  autoplay?: boolean;
  musicUrl?: string | null;
  // Dodatkowe przyciski na górnym pasku (np. ulubione)
  tools?: (index: number) => ReactNode;
  allowDownload?: boolean;
}) {
  const [playing, setPlaying] = useState(autoplay);
  const audioRef = useRef<HTMLAudioElement>(null);
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
      else if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
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

  // Pokaz slajdów: kolejne zdjęcie po kilku sekundach od wczytania bieżącego
  useEffect(() => {
    if (!playing || !loaded || items.length < 2) return;
    const t = setTimeout(() => go(1), SLIDE_MS);
    return () => clearTimeout(t);
  }, [playing, loaded, go, items.length]);

  useEffect(() => {
    const a = audioRef.current;
    if (playing) track("slideshow");
    if (!a) return;
    if (playing) a.play().catch(() => undefined);
    else a.pause();
  }, [playing]);

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
          {tools?.(index)}
          {items.length > 1 && (
            <button
              type="button"
              className={playing ? "lb-btn lb-play on" : "lb-btn lb-play"}
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? "Zatrzymaj pokaz slajdów" : "Pokaz slajdów"}
              title={playing ? "Zatrzymaj pokaz" : "Pokaz slajdów"}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                {playing ? (
                  <path d="M9 6v12M15 6v12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                ) : (
                  <path d="M8 5.5v13l10-6.5z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                )}
              </svg>
            </button>
          )}
          {allowDownload && (item.downloadUrl || item.webDownloadUrl) && (
            <DownloadMenu
              variant="lightbox"
              fullUrl={item.downloadUrl}
              webUrl={item.webDownloadUrl ?? item.url}
              fileName={item.name}
            />
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
          onContextMenu={allowDownload ? undefined : (e) => e.preventDefault()}
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
      {playing && <div className="lb-progress" key={`${index}-${loaded}`} style={{ animationDuration: `${SLIDE_MS}ms`, animationPlayState: loaded ? "running" : "paused" }} />}
      {musicUrl && <audio ref={audioRef} src={musicUrl} loop preload="none" />}
    </div>
  );
}
