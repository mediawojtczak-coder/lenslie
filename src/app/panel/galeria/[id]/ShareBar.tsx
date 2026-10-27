"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { useTr } from "@/components/LangProvider";

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
  domain,
  galleryLang = "pl",
}: {
  id: string;
  title: string;
  protectedByPassword: boolean;
  password: string | null;
  photoCount: number;
  domain?: string | null;
  galleryLang?: "pl" | "en";
}) {
  const t = useTr();
  const ge = galleryLang === "en";
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

  const link = domain ? `https://${domain}/${id}` : `${origin}/galeria/${id}`;
  const currentPassword = password ?? "";
  const passwordChanged = pass.trim() !== currentPassword;
  const shareText = currentPassword
    ? `${ge ? "Gallery link" : "Link do galerii"}: ${link}\n${ge ? "Password" : "Hasło"}: ${currentPassword}`
    : `${ge ? "Gallery link" : "Link do galerii"}: ${link}`;

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
      ge
        ? `Hello,\n\nyour photos from “${title}” are ready. You can find the gallery here:\n${link}` +
            (currentPassword ? `\n\nGallery password: ${currentPassword}` : "") +
            `\n\nEnjoy!`
        : `Dzień dobry,\n\nzdjęcia z sesji „${title}” są już gotowe. Galerię znajdziesz pod adresem:\n${link}` +
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
      setError(t("Nie udało się skopiować. Zaznacz tekst i skopiuj ręcznie.", "Could not copy. Select the text and copy it manually."));
    }
  }

  async function savePassword() {
    const value = pass.trim();
    if (value && value.length < 4) return setError(t("Hasło musi mieć co najmniej 4 znaki.", "The password must have at least 4 characters."));
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/galleries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gallery: id, clientPassword: value, removePassword: !value }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? t("Nie udało się zapisać hasła.", "Could not save the password."));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Nie udało się zapisać hasła.", "Could not save the password."));
    } finally {
      setSaving(false);
    }
  }

  const mailto = `mailto:${encodeURIComponent(email.trim())}?subject=${encodeURIComponent(
    `${ge ? "Your photos" : "Twoje zdjęcia"}: ${title}`,
  )}&body=${encodeURIComponent(body)}`;

  const status =
    photoCount === 0
      ? { label: t("Galeria jest pusta", "The gallery is empty"), note: t("Prześlij zdjęcia, zanim udostępnisz ją klientowi.", "Upload photos before sharing it with your client.") }
      : protectedByPassword
        ? { label: t("Galeria opublikowana", "Gallery published"), note: t("Dostęp chroniony hasłem", "Password protected") }
        : { label: t("Galeria opublikowana", "Gallery published"), note: t("Dostęp otwarty dla każdego z linkiem", "Open to anyone with the link") };

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
          {t("Podgląd galerii", "Preview gallery")}
        </a>
        <button type="button" className="btn btn-small" onClick={() => open()}>
          {t("Udostępnij galerię", "Share gallery")}
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
          <h2 id="share-title">{t("Udostępnij klientowi", "Share with your client")}</h2>

          <div className="share-tabs" role="tablist">
            {(
              [
                ["link", t("Link i hasło", "Link & password"), "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1m2 4.7a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"],
                ["email", t("E-mail", "Email"), "M4 6h16v12H4zM4 7l8 6 8-6"],
                ["qr", t("Kod QR", "QR code"), "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2v2h-2zM18 14h2v2h-2z"],
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
              <h3>{t("Hasło dostępu do galerii", "Gallery password")}</h3>
              <div className="pass-row">
                <input
                  aria-label={t("Hasło dostępu", "Password")}
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  placeholder={protectedByPassword ? t("Hasło ustawione wcześniej – nadaj nowe", "Password already set – enter a new one") : t("Brak hasła – galeria otwarta", "No password – gallery is open")}
                  autoComplete="off"
                  spellCheck={false}
                />
                <button type="button" className="btn btn-ghost btn-small" onClick={() => setPass(generatePassword())}>
                  {t("Generuj", "Generate")}
                </button>
              </div>
              {passwordChanged && (
                <button type="button" className="btn btn-small save-pass" onClick={savePassword} disabled={saving}>
                  {saving ? t("Zapisuję…", "Saving…") : pass.trim() ? t("Zapisz nowe hasło", "Save new password") : t("Usuń hasło", "Remove password")}
                </button>
              )}

              <p className="share-sub">{t("Adres galerii", "Gallery address")}</p>
              <a href={link} target="_blank" rel="noreferrer" className="share-url">
                {link}
              </a>

              <button
                type="button"
                className="btn"
                onClick={() => copy(shareText, "link")}
                disabled={passwordChanged}
              >
                {copied === "link" ? t("Skopiowano", "Copied") : currentPassword ? t("Kopiuj link i hasło", "Copy link & password") : t("Kopiuj link", "Copy link")}
              </button>
              {passwordChanged && <p className="hint-inline">{t("Najpierw zapisz zmienione hasło.", "Save the changed password first.")}</p>}
            </div>
          )}

          {tab === "email" && (
            <div className="share-card">
              <h3>{t("Wiadomość dla klienta", "Message for your client")}</h3>
              <label htmlFor="share-email">{t("Adres e-mail klienta", "Client email")}</label>
              <input
                id="share-email"
                type="email"
                placeholder={t("klient@example.com", "client@example.com")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <label htmlFor="share-body">{t("Treść", "Message")}</label>
              <textarea id="share-body" rows={8} value={body} onChange={(e) => setBody(e.target.value)} />
              <div className="email-actions">
                <a className="btn" href={mailto}>
                  {t("Otwórz w programie pocztowym", "Open in email app")}
                </a>
                <button type="button" className="as-link" onClick={() => copy(body, "email")}>
                  {copied === "email" ? t("Skopiowano", "Copied") : t("Kopiuj treść", "Copy text")}
                </button>
              </div>
            </div>
          )}

          {tab === "qr" && (
            <div className="share-card qr-card">
              <h3>{t("Kod QR do galerii", "Gallery QR code")}</h3>
              <p className="share-sub">{t("Wydrukuj go na podziękowaniu albo pokaż klientowi na telefonie.", "Print it on a thank-you card or show it to your client on your phone.")}</p>
              {qr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qr} alt={`${t("Kod QR prowadzący do", "QR code linking to")} ${link}`} className="qr-img" />
              ) : (
                <div className="qr-img qr-empty" />
              )}
              {qr && (
                <a className="btn" href={qr} download={`${id}-kod-qr.png`}>
                  {t("Pobierz kod QR", "Download QR code")}
                </a>
              )}
              {currentPassword && <p className="hint-inline">{t("Pamiętaj, aby przekazać klientowi także hasło.", "Remember to give your client the password too.")}</p>}
            </div>
          )}

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          <div className="modal-actions">
            <button type="button" className="as-link" onClick={close}>
              {t("Zamknij", "Close")}
            </button>
            <button type="button" className="btn btn-ghost" onClick={close}>
              {t("Gotowe", "Done")}
            </button>
          </div>
        </div>
      </dialog>
    </section>
  );
}
