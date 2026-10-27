"use client";

import { useState, type FormEvent } from "react";
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
}: {
  id: string;
  title: string;
  hasPassword: boolean;
  layout: "mozaika" | "siatka";
}) {
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
