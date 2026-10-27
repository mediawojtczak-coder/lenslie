"use client";

import { useState } from "react";
import Lightbox from "@/components/Lightbox";

type Item = { name: string; fileName: string; webUrl: string; downloadUrl: string };

export default function PhotoGrid({ photos, layout }: { photos: Item[]; layout: "mozaika" | "siatka" }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <>
      <section className={layout === "siatka" ? "even-grid" : "masonry"} aria-label="Zdjęcia">
        {photos.map((p, i) => (
          <figure key={p.name} className="photo">
            <button type="button" className="photo-open" onClick={() => setOpen(i)} aria-label={`Otwórz zdjęcie ${p.fileName}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.webUrl} alt={p.name} loading="lazy" />
            </button>
            <a className="photo-dl" href={p.downloadUrl} download>
              Pobierz
            </a>
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
