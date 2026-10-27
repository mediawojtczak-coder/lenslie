"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Lightbox from "@/components/Lightbox";
import DownloadMenu from "@/components/DownloadMenu";
import DownloadAll from "./DownloadAll";

export type GridItem = {
  name: string;
  fileName: string;
  webUrl: string;
  // Brak linku = to pobieranie jest wyłączone przez fotografa
  downloadUrl?: string;
  webDownloadUrl?: string;
  webFileName: string;
  // Znak wodny jeszcze się nakłada – pokazujemy nakładkę z napisem
  wmPending?: boolean;
};

export type Group = { id: string; name: string | null; photos: GridItem[] };

export type Favorites = { name: string | null; photos: string[] };

function Heart({ on, size = 20 }: { on: boolean; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path
        d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"
        fill={on ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Zdjęcia galerii u klienta: sekcje z menu, pobieranie sekcji, podgląd i pokaz slajdów
export default function PhotoGrid({
  groups,
  layout,
  zipBase,
  musicUrl,
  downloads = "all",
  watermark,
  galleryId,
  favorites,
}: {
  groups: Group[];
  layout: "mozaika" | "siatka";
  zipBase: string;
  musicUrl?: string | null;
  downloads?: "all" | "web" | "none";
  watermark?: string | null;
  galleryId?: string;
  // Ulubione: null = funkcja wyłączona (np. link dla gości)
  favorites?: Favorites | null;
}) {
  const [favs, setFavs] = useState<Set<string>>(new Set(favorites?.photos ?? []));
  const [who, setWho] = useState<string | null>(favorites?.name ?? null);
  const [onlyFavs, setOnlyFavs] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [favError, setFavError] = useState("");
  const startRef = useRef<HTMLDialogElement>(null);
  const sendRef = useRef<HTMLDialogElement>(null);

  const shownGroups = useMemo(
    () => (onlyFavs ? groups.map((g) => ({ ...g, photos: g.photos.filter((p) => favs.has(p.name)) })) : groups),
    [groups, onlyFavs, favs],
  );
  const all = useMemo(() => shownGroups.flatMap((g) => g.photos), [shownGroups]);
  const [open, setOpen] = useState<number | null>(null);
  const [autoplay, setAutoplay] = useState(false);
  const named = shownGroups.filter((g) => g.name && g.photos.length > 0);

  async function favApi(body: Record<string, unknown>) {
    const res = await fetch(`/api/galleries/${galleryId}/selection`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error ?? "Nie udało się zapisać.") as Error & { code?: string };
      err.code = data.code;
      throw err;
    }
    return data;
  }

  async function toggleFav(name: string) {
    if (!favorites) return;
    if (!who) {
      setPending(name);
      setFavError("");
      startRef.current?.showModal();
      return;
    }
    // Od razu zmieniamy serduszko, a serwer potwierdza w tle
    setFavs((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
    try {
      const data = await favApi({ action: "toggle", photo: name });
      setFavs(new Set(data.photos));
    } catch (err) {
      if ((err as { code?: string }).code === "NO_SELECTION") {
        setWho(null);
        setFavs(new Set());
      }
    }
  }

  async function startSelection(form: HTMLFormElement) {
    const fd = new FormData(form);
    setFavError("");
    try {
      const data = await favApi({ action: "start", name: fd.get("name"), email: fd.get("email") });
      setWho(data.name);
      startRef.current?.close();
      if (pending) {
        const p = pending;
        setPending(null);
        setFavs(new Set([p]));
        const res = await favApi({ action: "toggle", photo: p });
        setFavs(new Set(res.photos));
      }
    } catch (err) {
      setFavError(err instanceof Error ? err.message : "Nie udało się zapisać.");
    }
  }

  const [sent, setSent] = useState("");
  async function sendSelection(form: HTMLFormElement) {
    const fd = new FormData(form);
    setFavError("");
    try {
      await favApi({ action: "note", note: fd.get("note"), notify: true });
      setSent("Dziękujemy! Fotograf zobaczy Twój wybór w swoim panelu.");
    } catch (err) {
      setFavError(err instanceof Error ? err.message : "Nie udało się wysłać.");
    }
  }

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
          {shownGroups
            .filter((g) => g.photos.length > 0)
            .map((g) => (
              <a key={g.id} href={`#sekcja-${g.id}`}>
                {g.name ?? "Pozostałe"}
              </a>
            ))}
        </nav>
      )}

      {onlyFavs && all.length === 0 && <p className="notice">Nie masz jeszcze ulubionych zdjęć.</p>}

      {shownGroups
        .filter((g) => g.photos.length > 0)
        .map((g) => (
          <section key={g.id} id={`sekcja-${g.id}`} className="client-section" aria-label={g.name ?? "Zdjęcia"}>
            {named.length > 0 && (
              <div className="section-head">
                <h2>{g.name ?? "Pozostałe zdjęcia"}</h2>
                {downloads !== "none" && (
                  <DownloadAll
                    small
                    label="Pobierz sekcję"
                    allowFull={downloads === "all"}
                    zipName={`${zipBase}-${slug(g.name ?? "pozostale")}.zip`}
                    items={g.photos.map((p) => ({
                      url: p.downloadUrl ?? "",
                      fileName: p.fileName,
                      webUrl: p.webDownloadUrl ?? "",
                      webFileName: p.webFileName,
                    }))}
                  />
                )}
              </div>
            )}
            <div className={layout === "siatka" ? "client-grid even" : "client-grid"}>
              {g.photos.map((p) => (
                <figure key={p.name} className="photo">
                  <button type="button" className="photo-open" onClick={() => openAt(p)} aria-label={`Otwórz zdjęcie ${p.fileName}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.webUrl}
                      alt={p.name}
                      loading="lazy"
                      draggable={downloads !== "none"}
                      onContextMenu={downloads === "none" ? (e) => e.preventDefault() : undefined}
                    />
                  </button>
                  {p.wmPending && watermark && (
                    <span className="wm-overlay" aria-hidden="true">
                      {Array.from({ length: 24 }, () => watermark).join("   ·   ")}
                    </span>
                  )}
                  {favorites && favs.has(p.name) && (
                    <button type="button" className="fav-mark" onClick={() => toggleFav(p.name)} aria-label={`Usuń ${p.fileName} z ulubionych`}>
                      <Heart on size={18} />
                    </button>
                  )}
                  <div className="photo-actions">
                    {favorites && (
                      <button
                        type="button"
                        className={favs.has(p.name) ? "pa-btn fav on" : "pa-btn fav"}
                        onClick={() => toggleFav(p.name)}
                        aria-pressed={favs.has(p.name)}
                        aria-label={favs.has(p.name) ? `Usuń ${p.fileName} z ulubionych` : `Dodaj ${p.fileName} do ulubionych`}
                      >
                        <Heart on={favs.has(p.name)} size={22} />
                        <span>Ulubione</span>
                      </button>
                    )}
                    {downloads !== "none" && p.webDownloadUrl && (
                      <DownloadMenu
                        fullUrl={downloads === "all" ? p.downloadUrl : undefined}
                        webUrl={p.webDownloadUrl}
                        fileName={p.fileName}
                      />
                    )}
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

      {open !== null && all[open] && (
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
          allowDownload={downloads !== "none"}
          tools={
            favorites
              ? (i) => {
                  const p = all[i];
                  if (!p) return null;
                  const on = favs.has(p.name);
                  return (
                    <button
                      type="button"
                      className={on ? "lb-btn lb-fav on" : "lb-btn lb-fav"}
                      onClick={() => toggleFav(p.name)}
                      aria-pressed={on}
                      aria-label={on ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
                      title={on ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
                    >
                      <Heart on={on} />
                    </button>
                  );
                }
              : undefined
          }
        />
      )}

      {favorites && (favs.size > 0 || onlyFavs) && (
        <div className="fav-bar" role="region" aria-label="Ulubione">
          <span className="fav-count">
            <Heart on size={16} /> {favs.size}
          </span>
          <button type="button" onClick={() => setOnlyFavs((v) => !v)}>
            {onlyFavs ? "Pokaż wszystkie" : "Pokaż ulubione"}
          </button>
          <button
            type="button"
            className="fav-send"
            onClick={() => {
              setSent("");
              setFavError("");
              sendRef.current?.showModal();
            }}
          >
            Wyślij fotografowi
          </button>
        </div>
      )}

      {favorites && (
        <>
          <dialog
            ref={startRef}
            className="modal"
            aria-labelledby="fav-start"
            onClick={(e) => {
              if (e.target === startRef.current) startRef.current?.close();
            }}
          >
            <form
              className="modal-body"
              onSubmit={(e) => {
                e.preventDefault();
                startSelection(e.currentTarget);
              }}
            >
              <h2 id="fav-start">Twoje ulubione</h2>
              <p className="modal-lead">
                Zaznaczaj serduszkiem zdjęcia, które najbardziej Ci się podobają, np. do albumu lub wydruku. Fotograf zobaczy
                Twój wybór.
              </p>
              <label htmlFor="fav-name">Imię</label>
              <input id="fav-name" name="name" required maxLength={80} autoComplete="given-name" autoFocus />
              <label htmlFor="fav-email">E-mail (opcjonalnie)</label>
              <input id="fav-email" name="email" type="email" maxLength={120} autoComplete="email" />
              {favError && (
                <p className="error" role="alert">
                  {favError}
                </p>
              )}
              <div className="modal-actions">
                <button type="button" className="as-link" onClick={() => startRef.current?.close()}>
                  Anuluj
                </button>
                <button type="submit" className="btn">
                  Zaczynam wybierać
                </button>
              </div>
            </form>
          </dialog>

          <dialog
            ref={sendRef}
            className="modal"
            aria-labelledby="fav-send"
            onClick={(e) => {
              if (e.target === sendRef.current) sendRef.current?.close();
            }}
          >
            <form
              className="modal-body"
              onSubmit={(e) => {
                e.preventDefault();
                sendSelection(e.currentTarget);
              }}
            >
              <h2 id="fav-send">Wyślij wybór fotografowi</h2>
              {sent ? (
                <>
                  <p className="modal-lead">{sent}</p>
                  <div className="modal-actions">
                    <span />
                    <button type="button" className="btn" onClick={() => sendRef.current?.close()}>
                      Zamknij
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="modal-lead">
                    Wybrane zdjęcia: {favs.size}. Możesz dodać wiadomość, np. które zdjęcia do albumu, a które do druku.
                  </p>
                  <label htmlFor="fav-note">Wiadomość (opcjonalnie)</label>
                  <textarea id="fav-note" name="note" rows={4} maxLength={2000} className="modal-textarea" />
                  {favError && (
                    <p className="error" role="alert">
                      {favError}
                    </p>
                  )}
                  <div className="modal-actions">
                    <button type="button" className="as-link" onClick={() => sendRef.current?.close()}>
                      Anuluj
                    </button>
                    <button type="submit" className="btn">
                      Wyślij
                    </button>
                  </div>
                </>
              )}
            </form>
          </dialog>
        </>
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
