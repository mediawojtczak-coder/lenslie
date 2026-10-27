"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";

type Tab = "link" | "email" | "qr";

function generatePassword() {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = new Uint32Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export default function ShareBar({
  id,
  title,
  protectedByPassword,
  password,
  photoCount,
}: {
  id: string;
  title: string;
  protectedByPassword: boolean;
  password: string | null;
  photoCount: number;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState<Tab>("link");
  const [origin, setOrigin] = useState("");
  const [pass, setPass] = useState(password ?? "");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");
  const [qr, setQr] = useState("");
  const [email, setEmail] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => setOrigin(window.location.origin), []);
  useEffect(() => setPass(password ?? ""), [password]);

  const link = `${origin}/galeria/${id}`;
  const currentPassword = password ?? "";
  const passwordChanged = pass.trim() !== currentPassword;
  const shareText = currentPassword
    ? `Link do galerii: ${link}\nHasło: ${currentPassword}`
    : `Link do galerii: ${link}`;

  useEffect(() => {
    if (!origin) return;
    QRCode.toDataURL(link, { width: 560, margin: 1, color: { dark: "#3b3633", light: "#ffffff" } })
      .then(setQr)
      .catch(() => setQr(""));
  }, [origin, link]);

  function open(initial: Tab = "link") {
    setTab(initial);
    setError("");
    setCopied("");
    setBody(
      `Dzień dobry,\n\nzdjęcia z sesji „${title}” są już gotowe. Galerię znajdziesz pod adresem:\n${link}` +
        (currentPassword ? `\n\nHasło do galerii: ${currentPassword}` : "") +
        `\n\nMiłego oglądania!`,
    );
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      setError("Nie udało się skopiować. Zaznacz tekst i skopiuj ręcznie.");
    }
  }

  async function savePassword() {
    const value = pass.trim();
    if (value && value.length < 4) return setError("Hasło musi mieć co najmniej 4 znaki.");
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/galleries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gallery: id, clientPassword: value, removePassword: !value }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Nie udało się zapisać hasła.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zapisać hasła.");
    } finally {
      setSaving(false);
    }
  }

  const mailto = `mailto:${encodeURIComponent(email.trim())}?subject=${encodeURIComponent(
    `Twoje zdjęcia: ${title}`,
  )}&body=${encodeURIComponent(body)}`;

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
        <button type="button" className="btn btn-small" onClick={() => open()}>
          Udostępnij galerię
        </button>
      </div>

      <dialog
        ref={dialogRef}
        className="modal share-modal"
        aria-labelledby="share-title"
        onClick={(e) => {
          if (e.target === dialogRef.current) close();
        }}
      >
        <div className="modal-body">
          <h2 id="share-title">Udostępnij klientowi</h2>

          <div className="share-tabs" role="tablist">
            {(
              [
                ["link", "Link i hasło", "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1m2 4.7a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"],
                ["email", "E-mail", "M4 6h16v12H4zM4 7l8 6 8-6"],
                ["qr", "Kod QR", "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2v2h-2zM18 14h2v2h-2z"],
              ] as [Tab, string, string][]
            ).map(([key, label, d]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                className={tab === key ? "share-tab active" : "share-tab"}
                onClick={() => setTab(key)}
              >
                <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                  <path d={d} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {label}
              </button>
            ))}
          </div>

          {tab === "link" && (
            <div className="share-card">
              <h3>Hasło dostępu do galerii</h3>
              <div className="pass-row">
                <input
                  aria-label="Hasło dostępu"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  placeholder={protectedByPassword ? "Hasło ustawione wcześniej – nadaj nowe" : "Brak hasła – galeria otwarta"}
                  autoComplete="off"
                  spellCheck={false}
                />
                <button type="button" className="btn btn-ghost btn-small" onClick={() => setPass(generatePassword())}>
                  Generuj
                </button>
              </div>
              {passwordChanged && (
                <button type="button" className="btn btn-small save-pass" onClick={savePassword} disabled={saving}>
                  {saving ? "Zapisuję…" : pass.trim() ? "Zapisz nowe hasło" : "Usuń hasło"}
                </button>
              )}

              <p className="share-sub">Adres galerii</p>
              <a href={link} target="_blank" rel="noreferrer" className="share-url">
                {link}
              </a>

              <button
                type="button"
                className="btn"
                onClick={() => copy(shareText, "link")}
                disabled={passwordChanged}
              >
                {copied === "link" ? "Skopiowano" : currentPassword ? "Kopiuj link i hasło" : "Kopiuj link"}
              </button>
              {passwordChanged && <p className="hint-inline">Najpierw zapisz zmienione hasło.</p>}
            </div>
          )}

          {tab === "email" && (
            <div className="share-card">
              <h3>Wiadomość dla klienta</h3>
              <label htmlFor="share-email">Adres e-mail klienta</label>
              <input
                id="share-email"
                type="email"
                placeholder="klient@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <label htmlFor="share-body">Treść</label>
              <textarea id="share-body" rows={8} value={body} onChange={(e) => setBody(e.target.value)} />
              <div className="email-actions">
                <a className="btn" href={mailto}>
                  Otwórz w programie pocztowym
                </a>
                <button type="button" className="as-link" onClick={() => copy(body, "email")}>
                  {copied === "email" ? "Skopiowano" : "Kopiuj treść"}
                </button>
              </div>
            </div>
          )}

          {tab === "qr" && (
            <div className="share-card qr-card">
              <h3>Kod QR do galerii</h3>
              <p className="share-sub">Wydrukuj go na podziękowaniu albo pokaż klientowi na telefonie.</p>
              {qr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qr} alt={`Kod QR prowadzący do ${link}`} className="qr-img" />
              ) : (
                <div className="qr-img qr-empty" />
              )}
              {qr && (
                <a className="btn" href={qr} download={`${id}-kod-qr.png`}>
                  Pobierz kod QR
                </a>
              )}
              {currentPassword && <p className="hint-inline">Pamiętaj, aby przekazać klientowi także hasło.</p>}
            </div>
          )}

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          <div className="modal-actions">
            <button type="button" className="as-link" onClick={close}>
              Zamknij
            </button>
            <button type="button" className="btn btn-ghost" onClick={close}>
              Gotowe
            </button>
          </div>
        </div>
      </dialog>
    </section>
  );
}
