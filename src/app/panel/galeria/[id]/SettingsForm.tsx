"use client";

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
}: {
  id: string;
  title: string;
  hasPassword: boolean;
  layout: "mozaika" | "siatka";
  eventDate: string;
  welcome: string;
  hasMusic: boolean;
  children?: ReactNode;
}) {
  const [eventDate, setEventDate] = useState(initialDate);
  const [welcome, setWelcome] = useState(initialWelcome);
  const musicRef = useRef<HTMLInputElement>(null);
  const [music, setMusic] = useState<"idle" | "busy">("idle");
  const [musicMsg, setMusicMsg] = useState("");
  const router = useRouter();
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
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Nie udało się zapisać zmian.");
      setPassword("");
      setRemovePassword(false);
      setMessage("Zapisano zmiany.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zapisać zmian.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadMusic(file: File | undefined) {
    if (!file) return;
    if (!/\.mp3$/i.test(file.name) && file.type !== "audio/mpeg") {
      setMusicMsg("Wybierz plik w formacie MP3.");
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
      if (!res.ok) throw new Error(data.error ?? "Nie udało się przesłać muzyki.");
      const put = await fetch(data.url, { method: "PUT", headers: { "Content-Type": "audio/mpeg" }, body: file });
      if (!put.ok) throw new Error("Nie udało się przesłać muzyki.");
      await fetch(`/api/galleries/${id}/music`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "done" }),
      });
      setMusicMsg("Muzyka dodana. Zagra podczas pokazu slajdów.");
      router.refresh();
    } catch (err) {
      setMusicMsg(err instanceof Error ? err.message : "Nie udało się przesłać muzyki.");
    } finally {
      setMusic("idle");
      if (musicRef.current) musicRef.current.value = "";
    }
  }

  async function removeMusic() {
    setMusic("busy");
    await fetch(`/api/galleries/${id}/music`, { method: "DELETE" });
    setMusic("idle");
    setMusicMsg("Muzyka usunięta.");
    router.refresh();
  }

  async function removeGallery() {
    const ok = window.confirm(
      `Usunąć galerię „${initialTitle}” razem ze wszystkimi zdjęciami? Tej operacji nie można cofnąć.`,
    );
    if (!ok) return;
    setBusy(true);
    const res = await fetch(`/api/galleries/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/panel");
      router.refresh();
    } else {
      setBusy(false);
      setError("Nie udało się usunąć galerii.");
    }
  }

  return (
    <div className="settings">
      <form onSubmit={save} className="settings-card">
        <h2>Ustawienia galerii</h2>

        <label htmlFor="s-title">Nazwa galerii</label>
        <input id="s-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <p className="hint">Adres galerii pozostaje bez zmian: /galeria/{id}</p>

        <label htmlFor="s-date">Data wydarzenia</label>
        <input id="s-date" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
        <p className="hint">Wyświetla się na okładce galerii pod tytułem.</p>

        <label htmlFor="s-welcome">Wiadomość powitalna</label>
        <textarea
          id="s-welcome"
          rows={4}
          maxLength={1500}
          value={welcome}
          onChange={(e) => setWelcome(e.target.value)}
          placeholder="np. Kochani, dziękuję, że mogłam być z Wami tego dnia. Miłego oglądania!"
        />
        <p className="hint">Klient zobaczy ją nad zdjęciami. Zostaw puste, jeśli nie chcesz jej pokazywać.</p>

        <label htmlFor="s-pass">{hasPassword ? "Nowe hasło dla klienta" : "Hasło dla klienta"}</label>
        <div className="pass-row">
          <input
            id="s-pass"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setRemovePassword(false);
            }}
            placeholder={hasPassword ? "Zostaw puste, aby nie zmieniać" : "Brak hasła – galeria otwarta"}
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
            Generuj
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
            Usuń hasło (galeria będzie otwarta dla każdego z linkiem)
          </label>
        )}

        <label htmlFor="s-layout">Układ zdjęć</label>
        <select
          id="s-layout"
          className="plain-select"
          value={layout}
          onChange={(e) => setLayout(e.target.value as "mozaika" | "siatka")}
        >
          <option value="mozaika">Mozaika – naturalne proporcje</option>
          <option value="siatka">Siatka – równe, kwadratowe kadry</option>
        </select>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {message && <p className="success">{message}</p>}

        <button type="submit" className="btn" disabled={busy}>
          {busy ? "Zapisuję…" : "Zapisz zmiany"}
        </button>
      </form>

      <div className="settings-card">
        <h2>Muzyka do pokazu slajdów</h2>
        <p>
          Klient może uruchomić pokaz slajdów przyciskiem w galerii. Jeśli dodasz plik MP3 (do 25 MB), zagra w tle.
          Używaj tylko muzyki, do której masz prawa.
        </p>
        <div className="music-row">
          <button type="button" className="btn btn-ghost btn-small" onClick={() => musicRef.current?.click()} disabled={music === "busy"}>
            {music === "busy" ? "Przesyłam…" : hasMusic ? "Zmień muzykę" : "Dodaj muzykę"}
          </button>
          {hasMusic && (
            <button type="button" className="as-link" onClick={removeMusic} disabled={music === "busy"}>
              Usuń muzykę
            </button>
          )}
          <input ref={musicRef} type="file" accept="audio/mpeg,.mp3" hidden onChange={(e) => uploadMusic(e.target.files?.[0])} />
        </div>
        {musicMsg && <p className="hint-inline">{musicMsg}</p>}
      </div>

      {children}

      <div className="settings-card danger">
        <h2>Usuń galerię</h2>
        <p>Usuwa galerię i wszystkie zdjęcia z magazynu. Klient straci do nich dostęp.</p>
        <button type="button" className="btn btn-danger" onClick={removeGallery} disabled={busy}>
          Usuń galerię
        </button>
      </div>
    </div>
  );
}
