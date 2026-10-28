"use client";

import { useState } from "react";
import Lightbox from "@/components/Lightbox";

export default function PortfolioGallery({ photos, lang }: { photos: string[]; lang: "pl" | "en" }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <>
      <div className="pf-grid">
        {photos.map((url, i) => (
          <button key={url} type="button" className="pf-photo" onClick={() => setOpen(i)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" loading="lazy" />
          </button>
        ))}
      </div>
      {open !== null && (
        <Lightbox items={photos.map((url) => ({ url, name: "" }))} index={open} onIndex={setOpen} onClose={() => setOpen(null)} allowDownload={false} lang={lang} />
      )}
    </>
  );
}
