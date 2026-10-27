"use client";

import { useState } from "react";
import Lightbox from "@/components/Lightbox";

type Item = { name: string; fileName: string; webUrl: string; downloadUrl: string };

export default function PhotoGrid({ photos, layout }: { photos: Item[]; layout: "mozaika" | "siatka" }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <>
      <section className={layout === "siatka" ? "client-grid even" : "client-grid"} aria-label="Zdjęcia">
        {photos.map((p, i) => (
          <figure key={p.name} className="photo">
            <button type="button" className="photo-open" onClick={() => setOpen(i)} aria-label={`Otwórz zdjęcie ${p.fileName}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.webUrl} alt={p.name} loading="lazy" />
            </button>
            <div className="photo-actions">
              <a href={p.downloadUrl} download className="pa-btn" aria-label={`Pobierz ${p.fileName}`}>
                <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                  <path d="M12 4v11m0 0-4-4m4 4 4-4M5 19h14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Pobierz</span>
              </a>
              <button type="button" className="pa-btn" onClick={() => setOpen(i)} aria-label={`Powiększ ${p.fileName}`}>
                <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                  <circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M8.5 11h5M11 8.5v5M20 20l-4.5-4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span>Powiększ</span>
              </button>
            </div>
          </figure>
        ))}
      </section>

      {open !== null && (
        <Lightbox
          items={photos.map((p) => ({ url: p.webUrl, name: p.fileName, downloadUrl: p.downloadUrl }))}
          index={open}
          onIndex={setOpen}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}
