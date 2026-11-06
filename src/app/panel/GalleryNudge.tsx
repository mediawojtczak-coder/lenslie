"use client";

import { useState } from "react";
import { useTr, useLang } from "@/components/LangProvider";

const Envelope = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
    <rect x="3.5" y="6" width="17" height="12" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
    <path d="m4 7 8 6 8-6" fill="none" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);

// Na kafelku galerii: mail pary młodej i elegancka wysyłka przypomnienia (link, hasło, termin)
export default function GalleryNudge({ id, email: initialEmail, sentAt: initialSentAt }: { id: string; email: string | null; sentAt: string | null }) {
  const t = useTr();
  const lang = useLang();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(initialEmail ?? "");
  const [sentAt, setSentAt] = useState(initialSentAt);
  const [justSent, setJustSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fmt = (iso: string) => new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "pl-PL", { day: "numeric", month: "short" }).format(new Date(iso));

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/galleries/${id}/nudge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Error");
      setSentAt(data.sentAt);
      setJustSent(true);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="gn">
        <button type="button" className="gn-open" onClick={() => setOpen(true)}>
          <Envelope />
          <span>{t("Przypomnij parze", "Remind the couple")}</span>
        </button>
        {sentAt && (
          <span className={justSent ? "gn-sent gn-sent-new" : "gn-sent"}>
            <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
              <path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t("wysłano", "sent")} {fmt(sentAt)}
          </span>
        )}
      </div>
    );
  }

  return (
    <form className="gn gn-form" onSubmit={send}>
      <label className="gn-label" htmlFor={`gn-${id}`}>
        {t("E-mail pary młodej", "The couple's e-mail")}
      </label>
      <input
        id={`gn-${id}`}
        type="text"
        inputMode="email"
        autoComplete="email"
        autoFocus
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t("anna@… , piotr@…", "anna@… , peter@…")}
        maxLength={250}
      />
      <p className="gn-hint">
        {t(
          "Para dostanie mail z okładką, linkiem i hasłem – a 7 dni przed końcem dostępu przypomnienie.",
          "The couple gets an e-mail with the cover, link and password – plus a reminder 7 days before access ends.",
        )}
      </p>
      {error && (
        <p className="gn-error" role="alert">
          {error}
        </p>
      )}
      <div className="gn-actions">
        <button type="button" className="gn-cancel" onClick={() => setOpen(false)}>
          {t("Anuluj", "Cancel")}
        </button>
        <button type="submit" className="gn-send" disabled={busy || !email.trim()}>
          {busy ? t("Wysyłam…", "Sending…") : t("Wyślij", "Send")}
          {!busy && (
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
              <path d="M5 12h13M13 6.5 18.5 12 13 17.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>
    </form>
  );
}
