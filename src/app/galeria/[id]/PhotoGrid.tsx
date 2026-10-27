"use client";

import { useEffect, useMemo, useState } from "react";
import Lightbox from "@/components/Lightbox";
import DownloadMenu from "@/components/DownloadMenu";
import DownloadAll from "./DownloadAll";

export type GridItem = {
  name: string;
  fileName: string;
  webUrl: string;
  downloadUrl: string;
  webDownloadUrl: string;
  webFileName: string;
};

export type Group = { id: string; name: string | null; photos: GridItem[] };

// Zdjęcia galerii u klienta: sekcje z menu, pobieranie sekcji, podgląd i pokaz slajdów
export default function PhotoGrid({
  groups,
  layout,
  zipBase,
  musicUrl,
}: {
  groups: Group[];
  layout: "mozaika" | "siatka";
  zipBase: string;
  musicUrl?: string | null;
}) {
  const all = useMemo(() => groups.flatMap((g) => g.photos), [groups]);
  const [open, setOpen] = useState<number | null>(null);
  const [autoplay, setAutoplay] = useState(false);
  const named = groups.filter((g) => g.name && g.photos.length > 0);

  // Przycisk „Pokaz slajdów” na górnym pasku galerii
  useEffect(() => {
    const start = () => {
      setAutoplay(true);
      setOpen(0);
    };
    window.addEventListener("lenslie:slideshow", start);
    return () => window.removeEventListener("lenslie:slideshow", start);
  }, []);

  const openAt = (photo: GridItem) => {
    setAutoplay(false);
    setOpen(all.indexOf(photo));
  };

  return (
    <>
      {named.length > 1 && (
        <nav className="section-nav" aria-label="Sekcje galerii">
          {groups
            .filter((g) => g.photos.length > 0)
            .map((g) => (
              <a key={g.id} href={`#sekcja-${g.id}`}>
                {g.name ?? "Pozostałe"}
              </a>
            ))}
        </nav>
      )}

      {groups
        .filter((g) => g.photos.length > 0)
        .map((g) => (
          <section key={g.id} id={`sekcja-${g.id}`} className="client-section" aria-label={g.name ?? "Zdjęcia"}>
            {named.length > 0 && (
              <div className="section-head">
                <h2>{g.name ?? "Pozostałe zdjęcia"}</h2>
                <DownloadAll
                  small
                  label="Pobierz sekcję"
                  zipName={`${zipBase}-${slug(g.name ?? "pozostale")}.zip`}
                  items={g.photos.map((p) => ({
                    url: p.downloadUrl,
                    fileName: p.fileName,
                    webUrl: p.webDownloadUrl,
                    webFileName: p.webFileName,
                  }))}
                />
              </div>
            )}
            <div className={layout === "siatka" ? "client-grid even" : "client-grid"}>
              {g.photos.map((p) => (
                <figure key={p.name} className="photo">
                  <button type="button" className="photo-open" onClick={() => openAt(p)} aria-label={`Otwórz zdjęcie ${p.fileName}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.webUrl} alt={p.name} loading="lazy" />
                  </button>
                  <div className="photo-actions">
                    <DownloadMenu fullUrl={p.downloadUrl} webUrl={p.webDownloadUrl} fileName={p.fileName} />
                    <button type="button" className="pa-btn" onClick={() => openAt(p)} aria-label={`Powiększ ${p.fileName}`}>
                      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                        <circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M8.5 11h5M11 8.5v5M20 20l-4.5-4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      <span>Powiększ</span>
                    </button>
                  </div>
                </figure>
              ))}
            </div>
          </section>
        ))}

      {open !== null && (
        <Lightbox
          items={all.map((p) => ({
            url: p.webUrl,
            name: p.fileName,
            downloadUrl: p.downloadUrl,
            webDownloadUrl: p.webDownloadUrl,
          }))}
          index={open}
          onIndex={setOpen}
          onClose={() => {
            setOpen(null);
            setAutoplay(false);
          }}
          autoplay={autoplay}
          musicUrl={musicUrl}
        />
      )}
    </>
  );
}

function slug(text: string) {
  return text
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
