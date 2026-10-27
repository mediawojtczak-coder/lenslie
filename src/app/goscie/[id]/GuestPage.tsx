"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Lightbox from "@/components/Lightbox";
import DownloadAll from "@/app/galeria/[id]/DownloadAll";
import { uploadPhotos, type FileState } from "@/lib/upload-client";

type Ev = { id: string; title: string; date: string; welcome: string; lang: "pl" | "en"; showWall: boolean; allowDownload: boolean };
type P = { name: string; url: string; downloadUrl: string; webDownloadUrl: string; fileName: string; webFileName: string };

export default function GuestPage({
  event,
  state,
  owner,
  studio,
  photos,
}: {
  event: Ev;
  state: "active" | "draft" | "expired";
  owner: boolean;
  studio: string | null;
  photos: P[];
}) {
  const lang = event.lang;
  const t = (pl: string, en: string) => (lang === "en" ? en : pl);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; failed: number; total: number; part: number } | null>(null);
  const [thanks, setThanks] = useState("");
  const [error, setError] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const dateText = event.date
    ? new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "pl-PL", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${event.date}T00:00:00Z`))
    : "";

  async function upload(list: FileList | null) {
    const files = [...(list ?? [])].filter((f) => f.type.startsWith("image/") || /\.(heic|heif|jpe?g|png|webp)$/i.test(f.name));
    if (inputRef.current) inputRef.current.value = "";
    if (files.length === 0) return;
    setError("");
    setThanks("");
    const states: FileState[] = files.map(() => ({ status: "queued", progress: 0 }));
    const update = () => {
      const done = states.filter((s) => s.status === "done").length;
      const failed = states.filter((s) => s.status === "error" || s.status === "canceled").length;
      const part = states.reduce((sum, s) => sum + (s.status === "done" ? 1 : s.progress), 0) / files.length;
      setProgress({ done, failed, total: files.length, part });
    };
    update();
    try {
      const job = uploadPhotos(event.id, files, (i, s) => {
        states[i] = s;
        update();
      }, `/api/goscie/${event.id}/upload`);
      await job.done;
      const ok = states.filter((s) => s.status === "done").length;
      setThanks(
        ok === files.length
          ? t(`Dziękujemy! Dodano zdjęcia: ${ok}.`, `Thank you! Photos added: ${ok}.`)
          : t(`Dodano ${ok} z ${files.length} zdjęć. Pozostałe spróbuj wysłać jeszcze raz.`, `Added ${ok} of ${files.length} photos. Please try sending the rest again.`),
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Nie udało się wysłać zdjęć.", "Could not send the photos."));
    } finally {
      setProgress(null);
    }
  }

  const header = (
    <header className="gu-head">
      {studio && <p className="gu-studio">{studio}</p>}
      <p className="bk-kicker">{t("Zdjęcia od gości", "Guest photos")}</p>
      <h1>{event.title}</h1>
      {dateText && <p className="gu-date">{dateText}</p>}
    </header>
  );

  if (state !== "active" && !owner) {
    return (
      <main className="bk-page">
        {header}
        <section className="bk-card bk-center">
          <h2>{state === "draft" ? t("Galeria gości nie jest jeszcze aktywna", "The guest gallery is not active yet") : t("Dodawanie zdjęć zostało zakończone", "Photo uploads have ended")}</h2>
          <p>{t("Zajrzyj tu ponownie w dniu wydarzenia.", "Please check back on the day of the event.")}</p>
        </section>
      </main>
    );
  }

  const zipItems = photos.map((p) => ({ url: p.downloadUrl, fileName: p.fileName, webUrl: p.webDownloadUrl, webFileName: p.webFileName }));

  return (
    <main className="bk-page gu-page">
      {header}
      {owner && state !== "active" && (
        <p className="preview-banner">
          {state === "draft"
            ? t("Podgląd – goście mogą dodawać zdjęcia dopiero po aktywacji.", "Preview – guests can upload only after activation.")
            : t("Wydarzenie wygasło – goście nie dodają już zdjęć.", "The event has expired – guests can no longer upload.")}{" "}
          <a href={`/panel/goscie/${event.id}`}>{t("Wróć do panelu", "Back to dashboard")}</a>
        </p>
      )}

      <section className="bk-card bk-center gu-upload">
        {event.welcome && <p className="gu-welcome">{event.welcome}</p>}
        {progress ? (
          <div className="gu-progress" aria-live="polite">
            <p>
              {t("Wysyłam zdjęcia", "Sending photos")}: {progress.done} {t("z", "of")} {progress.total}
            </p>
            <div className="up-total">
              <span style={{ width: `${Math.round(progress.part * 100)}%` }} />
            </div>
            <small>{t("Nie zamykaj tej strony do końca wysyłania.", "Please keep this page open until it finishes.")}</small>
          </div>
        ) : (
          <>
            <button type="button" className="btn btn-dark gu-btn" onClick={() => inputRef.current?.click()} disabled={state !== "active"}>
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path d="M4 8h3l2-3h6l2 3h3v11H4z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <circle cx="12" cy="13" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              {t("Dodaj swoje zdjęcia", "Add your photos")}
            </button>
            <p className="gu-note">{t("Wybierz kilka naraz – bez logowania i bez aplikacji.", "Pick several at once – no login, no app.")}</p>
          </>
        )}
        <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => upload(e.target.files)} />
        {thanks && <p className="success">{thanks}</p>}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </section>

      {(event.showWall || owner) && photos.length > 0 && (
        <section className="gu-wall" aria-label={t("Zdjęcia gości", "Guest photos")}>
          <div className="gu-wall-head">
            <h2>
              {t("Zdjęcia gości", "Guest photos")} <span>{photos.length}</span>
            </h2>
            {(event.allowDownload || owner) && <DownloadAll items={zipItems} zipName={`${event.id}.zip`} lang={lang} />}
          </div>
          <div className="gu-grid">
            {photos.map((p, i) => (
              <button key={p.name} type="button" className="gu-tile" onClick={() => setOpen(i)} aria-label={t("Powiększ zdjęcie", "Enlarge photo")}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        </section>
      )}

      {open !== null && photos[open] && (
        <Lightbox
          items={photos.map((p) => ({
            url: p.url,
            name: p.fileName,
            downloadUrl: event.allowDownload || owner ? p.downloadUrl : undefined,
            webDownloadUrl: event.allowDownload || owner ? p.webDownloadUrl : undefined,
          }))}
          index={open}
          onIndex={setOpen}
          onClose={() => setOpen(null)}
          allowDownload={event.allowDownload || owner}
          lang={lang}
        />
      )}

      <footer className="bk-foot">
        <a href="https://www.lenslie.com">{t("Galeria gości w Lenslie", "Guest gallery by Lenslie")}</a>
      </footer>
    </main>
  );
}
