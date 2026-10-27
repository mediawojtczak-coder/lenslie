"use client";

import { useTr } from "@/components/LangProvider";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";

function generatePassword() {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = new Uint32Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export default function SettingsForm({
  id,
  title: initialTitle,
  hasPassword,
  layout: initialLayout,
  eventDate: initialDate,
  welcome: initialWelcome,
  hasMusic,
  children,
  lang: initialLang,
}: {
  id: string;
  title: string;
  hasPassword: boolean;
  layout: "mozaika" | "siatka";
  eventDate: string;
  welcome: string;
  hasMusic: boolean;
  children?: ReactNode;
  lang: "pl" | "en";
}) {
  const [lang, setLang] = useState(initialLang);
  const [eventDate, setEventDate] = useState(initialDate);
  const [welcome, setWelcome] = useState(initialWelcome);
  const musicRef = useRef<HTMLInputElement>(null);
  const [music, setMusic] = useState<"idle" | "busy">("idle");
  const [musicMsg, setMusicMsg] = useState("");
  const router = useRouter();
  const t = useTr();
  const [title, setTitle] = useState(initialTitle);
  const [password, setPassword] = useState("");
  const [removePassword, setRemovePassword] = useState(false);
  const [layout, setLayout] = useState(initialLayout);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/galleries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gallery: id,
          title: title.trim(),
          clientPassword: removePassword ? "" : password.trim(),
          removePassword,
          layout,
          eventDate,
          welcome,
          lang,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("Nie udało się zapisać zmian.", "Could not save the changes."));
      setPassword("");
      setRemovePassword(false);
      setMessage(t("Zapisano zmiany.", "Changes saved."));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Nie udało się zapisać zmian.", "Could not save the changes."));
    } finally {
      setBusy(false);
    }
  }

  async function uploadMusic(file: File | undefined) {
    if (!file) return;
    if (!/\.mp3$/i.test(file.name) && file.type !== "audio/mpeg") {
      setMusicMsg(t("Wybierz plik w formacie MP3.", "Choose an MP3 file."));
      return;
    }
    setMusic("busy");
    setMusicMsg("");
    try {
      const res = await fetch(`/api/galleries/${id}/music`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ size: file.size }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("Nie udało się przesłać muzyki.", "Could not upload the music."));
      const put = await fetch(data.url, { method: "PUT", headers: { "Content-Type": "audio/mpeg" }, body: file });
      if (!put.ok) throw new Error(t("Nie udało się przesłać muzyki.", "Could not upload the music."));
      await fetch(`/api/galleries/${id}/music`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "done" }),
      });
      setMusicMsg(t("Muzyka dodana. Zagra podczas pokazu slajdów.", "Music added. It will play during the slideshow."));
      router.refresh();
    } catch (err) {
      setMusicMsg(err instanceof Error ? err.message : t("Nie udało się przesłać muzyki.", "Could not upload the music."));
    } finally {
      setMusic("idle");
      if (musicRef.current) musicRef.current.value = "";
    }
  }

  async function removeMusic() {
    setMusic("busy");
    await fetch(`/api/galleries/${id}/music`, { method: "DELETE" });
    setMusic("idle");
    setMusicMsg(t("Muzyka usunięta.", "Music removed."));
    router.refresh();
  }

  async function removeGallery() {
    const ok = window.confirm(
      t(`Usunąć galerię „${initialTitle}” razem ze wszystkimi zdjęciami? Tej operacji nie można cofnąć.`, `Delete the gallery “${initialTitle}” with all its photos? This cannot be undone.`),
    );
    if (!ok) return;
    setBusy(true);
    const res = await fetch(`/api/galleries/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/panel");
      router.refresh();
    } else {
      setBusy(false);
      setError(t("Nie udało się usunąć galerii.", "Could not delete the gallery."));
    }
  }

  return (
    <div className="settings">
      <form onSubmit={save} className="settings-card">
        <h2>{t("Ustawienia galerii", "Gallery settings")}</h2>

        <label htmlFor="s-title">{t("Nazwa galerii", "Gallery name")}</label>
        <input id="s-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <p className="hint">{t("Adres galerii pozostaje bez zmian", "The gallery address stays the same")}: /galeria/{id}</p>

        <label htmlFor="s-lang">{t("Język galerii dla klienta", "Client gallery language")}</label>
        <select id="s-lang" className="plain-select" value={lang} onChange={(e) => setLang(e.target.value as "pl" | "en")}>
          <option value="pl">Polski</option>
          <option value="en">{t("English – dla par i gości z zagranicy", "English – for couples and guests from abroad")}</option>
        </select>
        <p className="hint">{t("Przyciski, menu i komunikaty w galerii klienta będą w tym języku. Tytuł, sekcje i powitanie wpisujesz sam.", "Buttons, menus and messages in the client gallery will be in this language. You write the title, sections and welcome message yourself.")}</p>

        <label htmlFor="s-date">{t("Data wydarzenia", "Event date")}</label>
        <input id="s-date" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
        <p className="hint">{t("Wyświetla się na okładce galerii pod tytułem.", "Shown on the gallery cover under the title.")}</p>

        <label htmlFor="s-welcome">{t("Wiadomość powitalna", "Welcome message")}</label>
        <textarea
          id="s-welcome"
          rows={4}
          maxLength={1500}
          value={welcome}
          onChange={(e) => setWelcome(e.target.value)}
          placeholder={t("np. Kochani, dziękuję, że mogłam być z Wami tego dnia. Miłego oglądania!", "e.g. Dear both, thank you for having me on your day. Enjoy the photos!")}
        />
        <p className="hint">{t("Klient zobaczy ją nad zdjęciami. Zostaw puste, jeśli nie chcesz jej pokazywać.", "Your client sees it above the photos. Leave empty to hide it.")}</p>

        <label htmlFor="s-pass">{hasPassword ? t("Nowe hasło dla klienta", "New client password") : t("Hasło dla klienta", "Client password")}</label>
        <div className="pass-row">
          <input
            id="s-pass"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setRemovePassword(false);
            }}
            placeholder={hasPassword ? t("Zostaw puste, aby nie zmieniać", "Leave empty to keep it") : t("Brak hasła – galeria otwarta", "No password – gallery is open")}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            className="btn btn-ghost btn-small"
            onClick={() => {
              setPassword(generatePassword());
              setRemovePassword(false);
            }}
          >
            {t("Generuj", "Generate")}
          </button>
        </div>
        {hasPassword && (
          <label className="check">
            <input
              type="checkbox"
              checked={removePassword}
              onChange={(e) => {
                setRemovePassword(e.target.checked);
                if (e.target.checked) setPassword("");
              }}
            />
            {t("Usuń hasło (galeria będzie otwarta dla każdego z linkiem)", "Remove password (anyone with the link can open the gallery)")}
          </label>
        )}

        <label htmlFor="s-layout">{t("Układ zdjęć", "Photo layout")}</label>
        <select
          id="s-layout"
          className="plain-select"
          value={layout}
          onChange={(e) => setLayout(e.target.value as "mozaika" | "siatka")}
        >
          <option value="mozaika">{t("Mozaika – naturalne proporcje", "Mosaic – natural proportions")}</option>
          <option value="siatka">{t("Siatka – równe, kwadratowe kadry", "Grid – even, square crops")}</option>
        </select>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {message && <p className="success">{message}</p>}

        <button type="submit" className="btn" disabled={busy}>
          {busy ? t("Zapisuję…", "Saving…") : t("Zapisz zmiany", "Save changes")}
        </button>
      </form>

      <div className="settings-card">
        <h2>{t("Muzyka do pokazu slajdów", "Slideshow music")}</h2>
        <p>
          {t("Klient może uruchomić pokaz slajdów przyciskiem w galerii. Jeśli dodasz plik MP3 (do 25 MB), zagra w tle. Używaj tylko muzyki, do której masz prawa.", "Your client can start a slideshow with a button in the gallery. If you add an MP3 file (up to 25 MB), it plays in the background. Only use music you have the rights to.")}
        </p>
        <div className="music-row">
          <button type="button" className="btn btn-ghost btn-small" onClick={() => musicRef.current?.click()} disabled={music === "busy"}>
            {music === "busy" ? t("Przesyłam…", "Uploading…") : hasMusic ? t("Zmień muzykę", "Change music") : t("Dodaj muzykę", "Add music")}
          </button>
          {hasMusic && (
            <button type="button" className="as-link" onClick={removeMusic} disabled={music === "busy"}>
              {t("Usuń muzykę", "Remove music")}
            </button>
          )}
          <input ref={musicRef} type="file" accept="audio/mpeg,.mp3" hidden onChange={(e) => uploadMusic(e.target.files?.[0])} />
        </div>
        {musicMsg && <p className="hint-inline">{musicMsg}</p>}
      </div>

      {children}

      <div className="settings-card danger">
        <h2>{t("Usuń galerię", "Delete gallery")}</h2>
        <p>{t("Usuwa galerię i wszystkie zdjęcia z magazynu. Klient straci do nich dostęp.", "Deletes the gallery and all photos from storage. Your client will lose access.")}</p>
        <button type="button" className="btn btn-danger" onClick={removeGallery} disabled={busy}>
          {t("Usuń galerię", "Delete gallery")}
        </button>
      </div>
    </div>
  );
}
