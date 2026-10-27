"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Lightbox from "@/components/Lightbox";
import DownloadMenu from "@/components/DownloadMenu";
import DownloadAll from "./DownloadAll";
import { T, type Lang } from "@/lib/i18n";

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
  lang = "pl",
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
  lang?: Lang;
}) {
  const t = T[lang];
  const [favs, setFavs] = useState<Set<string>>(new Set(favorites?.photos ?? []));
  const [who, setWho] = useState<string | null>(favorites?.name ?? null);
  const [onlyFavs, setOnlyFavs] = useState(false);
  // Pasek ulubionych pokazujemy dopiero przy zdjęciach, nie na okładce
  const [pastCover, setPastCover] = useState(false);
  useEffect(() => {
    const check = () => {
      const bar = document.getElementById("zdjecia");
      setPastCover(bar ? bar.getBoundingClientRect().top < window.innerHeight * 0.5 : true);
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, []);
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
      const err = new Error(data.error ?? t.saveError) as Error & { code?: string };
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
      setFavError(err instanceof Error ? err.message : t.saveError);
    }
  }

  const [sent, setSent] = useState("");
  async function sendSelection(form: HTMLFormElement) {
    const fd = new FormData(form);
    setFavError("");
    try {
      await favApi({ action: "note", note: fd.get("note"), notify: true });
      setSent(t.sentThanks);
    } catch (err) {
      setFavError(err instanceof Error ? err.message : t.sendError);
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
        <nav className="section-nav" aria-label={t.sections}>
          {shownGroups
            .filter((g) => g.photos.length > 0)
            .map((g) => (
              <a key={g.id} href={`#sekcja-${g.id}`}>
                {g.name ?? t.other}
              </a>
            ))}
        </nav>
      )}

      {onlyFavs && all.length === 0 && <p className="notice">{t.noFavs}</p>}

      {shownGroups
        .filter((g) => g.photos.length > 0)
        .map((g) => (
          <section key={g.id} id={`sekcja-${g.id}`} className="client-section" aria-label={g.name ?? t.otherPhotos}>
            {named.length > 0 && (
              <div className="section-head">
                <h2>{g.name ?? t.otherPhotos}</h2>
                {downloads !== "none" && (
                  <DownloadAll
                    small
                    label={t.downloadSection}
                    lang={lang}
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
                  <button type="button" className="photo-open" onClick={() => openAt(p)} aria-label={`${t.openPhoto} ${p.fileName}`}>
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
                    <button type="button" className="fav-mark" onClick={() => toggleFav(p.name)} aria-label={`${t.removeFav}: ${p.fileName}`}>
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
                        aria-label={`${favs.has(p.name) ? t.removeFav : t.addFav}: ${p.fileName}`}
                      >
                        <Heart on={favs.has(p.name)} size={22} />
                        <span>{t.favorites}</span>
                      </button>
                    )}
                    {downloads !== "none" && p.webDownloadUrl && (
                      <DownloadMenu
                        lang={lang}
                        fullUrl={downloads === "all" ? p.downloadUrl : undefined}
                        webUrl={p.webDownloadUrl}
                        fileName={p.fileName}
                      />
                    )}
                    <button type="button" className="pa-btn" onClick={() => openAt(p)} aria-label={`${t.enlarge} ${p.fileName}`}>
                      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                        <circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M8.5 11h5M11 8.5v5M20 20l-4.5-4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      <span>{t.enlarge}</span>
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
          lang={lang}
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
                      aria-label={on ? t.removeFav : t.addFav}
                      title={on ? t.removeFav : t.addFav}
                    >
                      <Heart on={on} />
                    </button>
                  );
                }
              : undefined
          }
        />
      )}

      {favorites && pastCover && (favs.size > 0 || onlyFavs) && (
        <div className="fav-bar" role="region" aria-label={t.favorites}>
          <span className="fav-count">
            <Heart on size={16} /> {favs.size}
          </span>
          <button type="button" onClick={() => setOnlyFavs((v) => !v)}>
            {onlyFavs ? t.showAll : t.showFavs}
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
            {t.sendToPhotographer}
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
              <h2 id="fav-start">{t.favTitle}</h2>
              <p className="modal-lead">
                {t.favLead}
              </p>
              <label htmlFor="fav-name">{t.name}</label>
              <input id="fav-name" name="name" required maxLength={80} autoComplete="given-name" autoFocus />
              <label htmlFor="fav-email">{t.emailOptional}</label>
              <input id="fav-email" name="email" type="email" maxLength={120} autoComplete="email" />
              {favError && (
                <p className="error" role="alert">
                  {favError}
                </p>
              )}
              <div className="modal-actions">
                <button type="button" className="as-link" onClick={() => startRef.current?.close()}>
                  {t.cancel}
                </button>
                <button type="submit" className="btn">
                  {t.startChoosing}
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
              <h2 id="fav-send">{t.sendTitle}</h2>
              {sent ? (
                <>
                  <p className="modal-lead">{sent}</p>
                  <div className="modal-actions">
                    <span />
                    <button type="button" className="btn" onClick={() => sendRef.current?.close()}>
                      {t.close}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="modal-lead">
                    {t.sendLead(favs.size)}
                  </p>
                  <label htmlFor="fav-note">{t.messageOptional}</label>
                  <textarea id="fav-note" name="note" rows={4} maxLength={2000} className="modal-textarea" />
                  {favError && (
                    <p className="error" role="alert">
                      {favError}
                    </p>
                  )}
                  <div className="modal-actions">
                    <button type="button" className="as-link" onClick={() => sendRef.current?.close()}>
                      {t.cancel}
                    </button>
                    <button type="submit" className="btn">
                      {t.send}
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
