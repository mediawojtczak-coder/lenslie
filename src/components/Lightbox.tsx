"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import DownloadMenu from "./DownloadMenu";
import { track } from "@/lib/track";
import { T, type Lang } from "@/lib/i18n";

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
  lang = "pl",
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
  lang?: Lang;
}) {
  const t = T[lang];
  const [playing, setPlaying] = useState(autoplay);
  const audioRef = useRef<HTMLAudioElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  // przesunięcie palcem (px): w bok = kolejne zdjęcie, w dół = zamknięcie
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [anim, setAnim] = useState(false);
  // powiększenie: skala + przesunięcie obrazu (px)
  const [zoom, setZoomState] = useState({ s: 1, x: 0, y: 0 });
  const [ui, setUi] = useState(true);
  const [ready, setReady] = useState<Set<string>>(() => new Set());
  const busy = useRef(false);
  const lastTouch = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);
  const g = useRef<{
    mode: "none" | "swipe" | "close" | "pan" | "pinch" | "pending";
    x: number; y: number; t: number; moved: boolean;
    dist: number; s: number; zx: number; zy: number;
  }>({ mode: "none", x: 0, y: 0, t: 0, moved: false, dist: 0, s: 1, zx: 0, zy: 0 });
  const n = items.length;
  const item = items[index];
  const loaded = item ? ready.has(item.url) : false;
  const zoomed = zoom.s > 1.01;
  const width = () => stageRef.current?.clientWidth || window.innerWidth;

  // przesunięcie obrazu w granicach powiększonego zdjęcia
  const clampZoom = useCallback((s: number, x: number, y: number) => {
    const img = stageRef.current?.querySelector<HTMLImageElement>(".lb-slide.cur .lb-img");
    const w = img?.clientWidth ?? 0;
    const h = img?.clientHeight ?? 0;
    const mx = (w * (s - 1)) / 2;
    const my = (h * (s - 1)) / 2;
    return { s, x: Math.max(-mx, Math.min(mx, x)), y: Math.max(-my, Math.min(my, y)) };
  }, []);

  // powiększenie w punkcie ekranu (cx, cy) – ten punkt zostaje pod palcem / kursorem
  const zoomAt = useCallback(
    (cx: number, cy: number, s = 2.5) => {
      const img = stageRef.current?.querySelector<HTMLImageElement>(".lb-slide.cur .lb-img");
      if (!img) return;
      const r = img.getBoundingClientRect();
      const ox = cx - (r.left + r.width / 2);
      const oy = cy - (r.top + r.height / 2);
      setZoomState(clampZoom(s, -ox * (s - 1), -oy * (s - 1)));
    },
    [clampZoom],
  );

  // przejście do sąsiedniego zdjęcia z animacją przesunięcia
  const go = useCallback(
    (dir: number) => {
      if (n < 2 || busy.current) return;
      busy.current = true;
      setZoomState({ s: 1, x: 0, y: 0 });
      setAnim(true);
      setDrag({ x: -dir * width(), y: 0 });
      setTimeout(() => {
        onIndex((index + dir + n) % n);
        setAnim(false);
        setDrag({ x: 0, y: 0 });
        busy.current = false;
      }, 260);
    },
    [index, n, onIndex],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Pisanie w polach formularza (np. okno ulubionych nad podglądem) nie steruje podglądem
      const t = e.target as HTMLElement | null;
      if (t?.closest?.("input, textarea, select, dialog")) return;
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
      if (tapTimer.current) clearTimeout(tapTimer.current);
    };
  }, [go, onClose]);

  // Wczytujemy z wyprzedzeniem dalsze zdjęcia (sąsiednie są już w przesuwanej taśmie)
  useEffect(() => {
    for (const d of [2, -2]) {
      const next = items[(index + d + n) % n];
      if (next && n > 3) {
        const img = new Image();
        img.src = next.url;
      }
    }
  }, [index, items, n]);

  // Pokaz slajdów: kolejne zdjęcie po kilku sekundach od wczytania bieżącego
  useEffect(() => {
    if (!playing || !loaded || n < 2) return;
    const t = setTimeout(() => go(1), SLIDE_MS);
    return () => clearTimeout(t);
  }, [playing, loaded, go, n]);

  useEffect(() => {
    const a = audioRef.current;
    if (playing) track("slideshow");
    if (!a) return;
    if (playing) a.play().catch(() => undefined);
    else a.pause();
  }, [playing]);

  if (!item) return null;

  const dist = (a: { clientX: number; clientY: number }, b: { clientX: number; clientY: number }) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

  function onTouchStart(e: React.TouchEvent) {
    lastTouch.current = Date.now();
    if ((e.target as Element).closest("button, a, .lb-top, dialog")) return;
    if (busy.current) return;
    const t0 = e.touches[0];
    if (e.touches.length === 2) {
      g.current = { ...g.current, mode: "pinch", dist: dist(e.touches[0], e.touches[1]), s: zoom.s, zx: zoom.x, zy: zoom.y, moved: true };
      return;
    }
    g.current = { mode: zoomed ? "pan" : "pending", x: t0.clientX, y: t0.clientY, t: Date.now(), moved: false, dist: 0, s: zoom.s, zx: zoom.x, zy: zoom.y };
  }

  function onTouchMove(e: React.TouchEvent) {
    const st = g.current;
    if (st.mode === "none") return;
    if (st.mode === "pinch" && e.touches.length === 2) {
      const s = Math.max(1, Math.min(4, (st.s * dist(e.touches[0], e.touches[1])) / st.dist));
      setZoomState(clampZoom(s, (st.zx * s) / st.s, (st.zy * s) / st.s));
      return;
    }
    const t0 = e.touches[0];
    const dx = t0.clientX - st.x;
    const dy = t0.clientY - st.y;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) st.moved = true;
    if (st.mode === "pan") {
      setZoomState(clampZoom(zoom.s, st.zx + dx, st.zy + dy));
      return;
    }
    if (st.mode === "pending") {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      st.mode = Math.abs(dx) >= Math.abs(dy) ? "swipe" : dy > 0 ? "close" : "none";
    }
    if (st.mode === "swipe") setDrag({ x: n < 2 ? dx * 0.25 : dx, y: 0 });
    else if (st.mode === "close") setDrag({ x: 0, y: Math.max(0, dy) });
  }

  function onTouchEnd(e: React.TouchEvent) {
    lastTouch.current = Date.now();
    const st = g.current;
    if (st.mode === "pinch") {
      if (e.touches.length === 1) {
        // po zdjęciu jednego palca dalej przesuwamy powiększone zdjęcie
        g.current = { ...st, mode: "pan", x: e.touches[0].clientX, y: e.touches[0].clientY, zx: zoom.x, zy: zoom.y };
        return;
      }
      if (zoom.s < 1.05) setZoomState({ s: 1, x: 0, y: 0 });
      g.current.mode = "none";
      return;
    }
    const end = e.changedTouches[0];
    const dt = Math.max(1, Date.now() - st.t);
    if (st.mode === "swipe") {
      const dx = end.clientX - st.x;
      const fast = Math.abs(dx) / dt > 0.45;
      if (n > 1 && (Math.abs(dx) > width() * 0.2 || (fast && Math.abs(dx) > 30))) go(dx < 0 ? 1 : -1);
      else {
        setAnim(true);
        setDrag({ x: 0, y: 0 });
        setTimeout(() => setAnim(false), 260);
      }
    } else if (st.mode === "close") {
      const dy = end.clientY - st.y;
      if (dy > 110 || (dy / dt > 0.5 && dy > 40)) onClose();
      else {
        setAnim(true);
        setDrag({ x: 0, y: 0 });
        setTimeout(() => setAnim(false), 260);
      }
    } else if (!st.moved && (st.mode === "pending" || st.mode === "pan")) {
      // stuknięcie: dwa razy = powiększ / pomniejsz, raz = pokaż / ukryj przyciski
      const now = Date.now();
      const prev = lastTap.current;
      if (prev && now - prev.t < 300 && Math.hypot(end.clientX - prev.x, end.clientY - prev.y) < 40) {
        if (tapTimer.current) clearTimeout(tapTimer.current);
        lastTap.current = null;
        if (zoomed) setZoomState({ s: 1, x: 0, y: 0 });
        else zoomAt(end.clientX, end.clientY);
      } else {
        lastTap.current = { t: now, x: end.clientX, y: end.clientY };
        if (tapTimer.current) clearTimeout(tapTimer.current);
        tapTimer.current = setTimeout(() => setUi((u) => !u), 300);
      }
    }
    g.current.mode = "none";
  }

  // komputer: kliknięcie w zdjęcie powiększa w tym miejscu, ponowne – pomniejsza
  function onImgClick(e: React.MouseEvent<HTMLImageElement>) {
    if (Date.now() - lastTouch.current < 700) return;
    if (zoomed) setZoomState({ s: 1, x: 0, y: 0 });
    else zoomAt(e.clientX, e.clientY, 2.2);
  }

  const slides = n > 1 ? [-1, 0, 1] : [0];
  const fade = Math.min(drag.y / 500, 0.6);

  return (
    <div
      className={ui ? "lightbox" : "lightbox ui-off"}
      role="dialog"
      aria-modal="true"
      aria-label={t.photoOf(index + 1, items.length)}
      style={{ backgroundColor: `rgba(12, 11, 10, ${1 - fade})` }}
      onClick={(e) => {
        if (Date.now() - lastTouch.current < 700) return;
        if (e.target === e.currentTarget || (e.target as Element).classList.contains("lb-slide")) onClose();
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
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
              aria-label={playing ? t.stopSlideshow : t.slideshow}
              title={playing ? t.stopSlideshow : t.slideshow}
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
              lang={lang}
            />
          )}
          <button type="button" className="lb-btn" onClick={() => (zoomed ? setZoomState({ s: 1, x: 0, y: 0 }) : zoomAt(window.innerWidth / 2, window.innerHeight / 2, 2.2))} aria-label={zoomed ? t.shrink : t.enlarge} title={zoomed ? t.shrink : t.enlarge}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d={zoomed ? "M8.5 11h5M20 20l-4.5-4.5" : "M8.5 11h5M11 8.5v5M20 20l-4.5-4.5"} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <button type="button" className="lb-btn" onClick={onClose} aria-label={t.close} title={t.close}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      <div ref={stageRef} className={zoomed ? "lb-stage zoomed" : "lb-stage"}>
        <div
          className={anim ? "lb-track anim" : "lb-track"}
          style={{ transform: `translate3d(${drag.x}px, ${drag.y}px, 0) scale(${1 - fade * 0.25})` }}
        >
          {slides.map((pos) => {
            const it = items[(index + pos + n) % n];
            if (!it) return null;
            const cur = pos === 0;
            return (
              <div key={n >= 3 ? it.url : `p${pos}`} className={cur ? "lb-slide cur" : "lb-slide"} style={{ transform: `translateX(${pos * 100}%)` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={it.url}
                  alt={cur ? it.name : ""}
                  aria-hidden={cur ? undefined : true}
                  className={ready.has(it.url) ? "lb-img ready" : "lb-img"}
                  style={cur && zoomed ? { transform: `translate3d(${zoom.x}px, ${zoom.y}px, 0) scale(${zoom.s})` } : undefined}
                  onLoad={() => setReady((r) => (r.has(it.url) ? r : new Set(r).add(it.url)))}
                  onClick={cur ? onImgClick : undefined}
                  onContextMenu={allowDownload ? undefined : (e) => e.preventDefault()}
                  draggable={false}
                />
              </div>
            );
          })}
        </div>
      </div>

      {items.length > 1 && (
        <>
          <button type="button" className="lb-nav lb-prev" onClick={() => go(-1)} aria-label={t.prev}>
            <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button type="button" className="lb-nav lb-next" onClick={() => go(1)} aria-label={t.next}>
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
