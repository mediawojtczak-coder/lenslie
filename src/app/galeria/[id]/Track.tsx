"use client";

import { useEffect } from "react";

// Wysyła statystyki: otwarcie galerii (raz na wizytę), pobrania pojedynczych zdjęć, ZIP-y i pokazy slajdów
export default function Track({ galleryId, mode }: { galleryId: string; mode: "client" | "guest" }) {
  useEffect(() => {
    const send = (kind: string, photo?: string) => {
      const body = JSON.stringify({ kind, photo });
      const url = `/api/galleries/${galleryId}/event`;
      if (navigator.sendBeacon) navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
      else fetch(url, { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
    };

    try {
      const key = `lv_${galleryId}_${mode}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        send(mode === "guest" ? "guest_view" : "view");
      }
    } catch {
      send(mode === "guest" ? "guest_view" : "view");
    }

    const onTrack = (e: Event) => {
      const d = (e as CustomEvent<{ kind: string; photo?: string }>).detail;
      if (d?.kind) send(d.kind, d.photo);
    };
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-track]");
      if (el) send(el.dataset.track!, el.dataset.photo);
    };
    window.addEventListener("lenslie:track", onTrack);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("lenslie:track", onTrack);
      document.removeEventListener("click", onClick, true);
    };
  }, [galleryId, mode]);

  return null;
}
