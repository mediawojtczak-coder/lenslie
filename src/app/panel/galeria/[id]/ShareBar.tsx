"use client";

import { useEffect, useState } from "react";

export default function ShareBar({
  id,
  protectedByPassword,
  password,
  photoCount,
}: {
  id: string;
  protectedByPassword: boolean;
  password: string | null;
  photoCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState("");

  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const link = `${origin}/galeria/${id}`;

  const message = password
    ? `Twoje zdjęcia są gotowe: ${link}\nHasło do galerii: ${password}`
    : `Twoje zdjęcia są gotowe: ${link}`;

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      setCopied("");
    }
  }

  const status =
    photoCount === 0
      ? { label: "Galeria jest pusta", note: "Prześlij zdjęcia, zanim udostępnisz ją klientowi." }
      : protectedByPassword
        ? { label: "Galeria opublikowana", note: "Dostęp chroniony hasłem" }
        : { label: "Galeria opublikowana", note: "Dostęp otwarty dla każdego z linkiem" };

  return (
    <section className="share-bar">
      <div className="share-status">
        <span className={photoCount === 0 ? "dot dot-off" : "dot"} aria-hidden="true" />
        <div>
          <p className="share-label">{status.label}</p>
          <p className="share-note">{status.note}</p>
        </div>
      </div>

      <div className="share-actions">
        <a href={`/galeria/${id}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-small">
          Podgląd galerii
        </a>
        <button type="button" className="btn btn-small" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          Udostępnij galerię
        </button>
      </div>

      {open && (
        <div className="share-panel">
          <label htmlFor="share-link">Link do galerii</label>
          <div className="copy-row">
            <input id="share-link" readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
            <button type="button" className="as-link" onClick={() => copy(link, "link")}>
              {copied === "link" ? "Skopiowano" : "Kopiuj"}
            </button>
          </div>

          {protectedByPassword && (
            <>
              <label htmlFor="share-pass">Hasło</label>
              <div className="copy-row">
                <input
                  id="share-pass"
                  readOnly
                  value={password ?? "Ustawione wcześniej – możesz nadać nowe w Ustawieniach"}
                />
                {password && (
                  <button type="button" className="as-link" onClick={() => copy(password, "haslo")}>
                    {copied === "haslo" ? "Skopiowano" : "Kopiuj"}
                  </button>
                )}
              </div>
            </>
          )}

          <button type="button" className="btn btn-small" onClick={() => copy(message, "wiadomosc")}>
            {copied === "wiadomosc" ? "Skopiowano wiadomość" : "Kopiuj wiadomość dla klienta"}
          </button>
        </div>
      )}
    </section>
  );
}
