"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Lightbox from "@/components/Lightbox";
import DownloadAll from "@/app/galeria/[id]/DownloadAll";
import { uploadPhotos, type FileState } from "@/lib/upload-client";

type Ev = { id: string; title: string; date: string; welcome: string; lang: "pl" | "en"; showWall: boolean; allowDownload: boolean };
type P = { name: string; url: string; downloadUrl: string; webDownloadUrl: string; fileName: string; webFileName: string };

// Delikatna gałązka – ozdobnik w stylu zaproszeń ślubnych
function Sprig({ className = "" }: { className?: string }) {
  return (
    <svg className={`gu-sprig ${className}`} viewBox="0 0 220 40" aria-hidden="true">
      <path d="M8 20 H92" />
      <path d="M128 20 H212" />
      <path d="M110 8 C104 14 104 26 110 32 C116 26 116 14 110 8 Z" />
      <path d="M92 20 C86 12 76 10 68 12 C74 18 84 21 92 20 Z" />
      <path d="M92 20 C86 28 76 30 68 28 C74 22 84 19 92 20 Z" />
      <path d="M128 20 C134 12 144 10 152 12 C146 18 136 21 128 20 Z" />
      <path d="M128 20 C134 28 144 30 152 28 C146 22 136 19 128 20 Z" />
    </svg>
  );
}

export default function GuestPage({
  event,
  state,
  owner,
  studio,
  cover,
  photos,
}: {
  event: Ev;
  state: "active" | "draft" | "expired";
  owner: boolean;
  studio: string | null;
  cover: string | null;
  photos: P[];
}) {
  const lang = event.lang;
  const t = (pl: string, en: string) => (lang === "en" ? en : pl);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number; part: number } | null>(null);
  const [thanks, setThanks] = useState("");
  const [error, setError] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const dateText = event.date
    ? new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "pl-PL", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${event.date}T00:00:00Z`))
    : "";
  const canDownload = event.allowDownload || owner;

  async function upload(list: FileList | null) {
    const files = [...(list ?? [])].filter((f) => f.type.startsWith("image/") || /\.(heic|heif|jpe?g|png|webp)$/i.test(f.name));
    if (inputRef.current) inputRef.current.value = "";
    if (files.length === 0) return;
    setError("");
    setThanks("");
    const states: FileState[] = files.map(() => ({ status: "queued", progress: 0 }));
    const update = () => {
      const done = states.filter((s) => s.status === "done").length;
      const part = states.reduce((sum, s) => sum + (s.status === "done" ? 1 : s.progress), 0) / files.length;
      setProgress({ done, total: files.length, part });
    };
    update();
    try {
      const job = uploadPhotos(
        event.id,
        files,
        (i, s) => {
          states[i] = s;
          update();
        },
        `/api/goscie/${event.id}/upload`,
      );
      await job.done;
      const ok = states.filter((s) => s.status === "done").length;
      setThanks(
        ok === files.length
          ? t(`Dziękujemy! Dodano ${ok === 1 ? "zdjęcie" : `zdjęcia: ${ok}`}.`, `Thank you! ${ok === 1 ? "Photo" : `${ok} photos`} added.`)
          : t(`Dodano ${ok} z ${files.length} zdjęć. Pozostałe spróbuj wysłać jeszcze raz.`, `Added ${ok} of ${files.length} photos. Please try sending the rest again.`),
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Nie udało się wysłać zdjęć.", "Could not send the photos."));
    } finally {
      setProgress(null);
    }
  }

  const hero = (
    <header className={cover ? "gu-hero has-cover" : "gu-hero"}>
      {cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt="" className="gu-hero-img" />
      )}
      <div className="gu-hero-in">
        {studio && <p className="gu-studio">{studio}</p>}
        <Sprig />
        <h1 className="gu-names">{event.title}</h1>
        {dateText && (
          <p className="gu-date">
            <span />
            {dateText}
            <span />
          </p>
        )}
      </div>
    </header>
  );

  if (state !== "active" && !owner) {
    return (
      <main className="gu-page">
        {hero}
        <section className="gu-card">
          <h2>{state === "draft" ? t("Już niedługo", "Coming soon") : t("Dziękujemy za wszystkie zdjęcia", "Thank you for all the photos")}</h2>
          <p>
            {state === "draft"
              ? t("Galeria gości nie jest jeszcze aktywna. Zajrzyj tu w dniu wydarzenia.", "The guest gallery is not active yet. Please check back on the day.")
              : t("Dodawanie zdjęć zostało zakończone.", "Photo uploads have ended.")}
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="gu-page">
      {owner && state !== "active" && (
        <p className="preview-banner">
          {state === "draft"
            ? t("Podgląd – goście mogą dodawać zdjęcia dopiero po aktywacji.", "Preview – guests can upload only after activation.")
            : t("Wydarzenie wygasło – goście nie dodają już zdjęć.", "The event has expired – guests can no longer upload.")}{" "}
          <a href={`/panel/goscie/${event.id}`}>{t("Wróć do panelu", "Back to dashboard")}</a>
        </p>
      )}
      {hero}

      <section className="gu-card">
        <p className="gu-script">{t("Podzielcie się chwilami", "Share the moments")}</p>
        {event.welcome ? (
          <p className="gu-welcome">{event.welcome}</p>
        ) : (
          <p className="gu-welcome">
            {t(
              "Każde zdjęcie z Waszego telefonu to kawałek tego dnia, którego nie zobaczylibyśmy inaczej. Dodajcie je tutaj – dziękujemy!",
              "Every photo from your phone is a piece of this day we would never see otherwise. Add them here – thank you!",
            )}
          </p>
        )}

        {progress ? (
          <div className="gu-progress" aria-live="polite">
            <p>
              {t("Wysyłam zdjęcia", "Sending photos")} · {progress.done} {t("z", "of")} {progress.total}
            </p>
            <div className="gu-bar">
              <span style={{ width: `${Math.max(4, Math.round(progress.part * 100))}%` }} />
            </div>
            <small>{t("Nie zamykaj tej strony do końca wysyłania.", "Please keep this page open until it finishes.")}</small>
          </div>
        ) : (
          <button type="button" className="gu-btn" onClick={() => inputRef.current?.click()} disabled={state !== "active"}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M4 8h3l2-3h6l2 3h3v11H4z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <circle cx="12" cy="13" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            {t("Dodaj swoje zdjęcia", "Add your photos")}
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => upload(e.target.files)} />
        {thanks && <p className="gu-thanks">{thanks}</p>}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <ol className="gu-steps">
          <li>
            <span>1</span>
            {t("Kliknij „Dodaj swoje zdjęcia”", "Tap “Add your photos”")}
          </li>
          <li>
            <span>2</span>
            {t("Wybierz kilka zdjęć naraz", "Pick several photos at once")}
          </li>
          <li>
            <span>3</span>
            {t("Gotowe – bez logowania i aplikacji", "Done – no login, no app")}
          </li>
        </ol>
      </section>

      {(event.showWall || owner) && photos.length > 0 && (
        <section className="gu-wall" aria-label={t("Zdjęcia gości", "Guest photos")}>
          <div className="gu-wall-head">
            <Sprig className="small" />
            <h2>{t("Wasze zdjęcia", "Your photos")}</h2>
            <p>
              {photos.length} {t(photos.length === 1 ? "zdjęcie" : "zdjęć od gości", photos.length === 1 ? "photo" : "photos from guests")}
            </p>
            {canDownload && <DownloadAll items={photos.map((p) => ({ url: p.downloadUrl, fileName: p.fileName, webUrl: p.webDownloadUrl, webFileName: p.webFileName }))} zipName={`${event.id}.zip`} lang={lang} />}
          </div>
          <div className="gu-masonry">
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
            downloadUrl: canDownload ? p.downloadUrl : undefined,
            webDownloadUrl: canDownload ? p.webDownloadUrl : undefined,
          }))}
          index={open}
          onIndex={setOpen}
          onClose={() => setOpen(null)}
          allowDownload={canDownload}
          lang={lang}
        />
      )}

      <footer className="gu-foot">
        <Sprig className="small" />
        <a href="https://www.lenslie.com">{studio ? `${studio} · ` : ""}{t("Galeria gości w Lenslie", "Guest gallery by Lenslie")}</a>
      </footer>
    </main>
  );
}
