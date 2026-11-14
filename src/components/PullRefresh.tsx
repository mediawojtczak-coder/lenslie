"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const LIMIT = 70; // ile pikseli trzeba pociągnąć, żeby odświeżyć

// Odświeżanie panelu przeciągnięciem palcem w dół – tylko w aplikacji na ekranie głównym
// (w zwykłej przeglądarce robi to sama przeglądarka)
export default function PullRefresh() {
  const router = useRouter();
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const start = useRef<number | null>(null);
  const cur = useRef(0);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    if (!standalone) return;
    const blocked = (t: EventTarget | null) =>
      document.body.style.overflow === "hidden" || Boolean((t as Element | null)?.closest?.(".lightbox, dialog, .spe-modal, input, textarea, select, [data-no-pull]"));
    const down = (e: TouchEvent) => {
      start.current = window.scrollY <= 0 && e.touches.length === 1 && !blocked(e.target) ? e.touches[0].clientY : null;
    };
    const move = (e: TouchEvent) => {
      if (start.current === null) return;
      const dy = e.touches[0].clientY - start.current;
      if (dy <= 0 || window.scrollY > 0) {
        cur.current = 0;
        setPull(0);
        return;
      }
      cur.current = Math.min(110, dy * 0.5);
      setPull(cur.current);
    };
    const up = () => {
      if (start.current === null) return;
      start.current = null;
      if (cur.current >= LIMIT) {
        setBusy(true);
        setPull(LIMIT);
        router.refresh();
        setTimeout(() => {
          setBusy(false);
          setPull(0);
        }, 900);
      } else setPull(0);
      cur.current = 0;
    };
    window.addEventListener("touchstart", down, { passive: true });
    window.addEventListener("touchmove", move, { passive: true });
    window.addEventListener("touchend", up);
    window.addEventListener("touchcancel", up);
    return () => {
      window.removeEventListener("touchstart", down);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
      window.removeEventListener("touchcancel", up);
    };
  }, [router]);

  if (!pull && !busy) return null;
  const ready = pull >= LIMIT;
  return (
    <div className="ptr" style={{ transform: `translate(-50%, ${pull - 44}px)`, opacity: Math.min(1, pull / LIMIT) }} aria-hidden="true">
      <svg viewBox="0 0 24 24" width="20" height="20" className={busy ? "ptr-spin" : undefined} style={busy ? undefined : { transform: `rotate(${pull * 3}deg)` }}>
        <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4.5h-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity={ready || busy ? 1 : 0.55} />
      </svg>
    </div>
  );
}
