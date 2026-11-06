"use client";

import { useState } from "react";
import { useTr, useLang } from "@/components/LangProvider";

// Na kafelku galerii: wpisanie maila pary młodej i wysłanie im przypomnienia o galerii (link, hasło, termin)
export default function GalleryNudge({ id, email: initialEmail, sentAt: initialSentAt }: { id: string; email: string | null; sentAt: string | null }) {
  const t = useTr();
  const lang = useLang();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(initialEmail ?? "");
  const [sentAt, setSentAt] = useState(initialSentAt);
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
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="g-nudge-btn" onClick={() => setOpen(true)}>
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
          <rect x="3" y="5.5" width="18" height="13" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="m3.5 7 8.5 6 8.5-6" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        {sentAt ? (
          <span>
            {t("Przypomnienie wysłane", "Reminder sent")} {fmt(sentAt)} · <u>{t("wyślij ponownie", "send again")}</u>
          </span>
        ) : (
          <span>{t("Przypomnij parze mailem", "Remind the couple by e-mail")}</span>
        )}
      </button>
    );
  }

  return (
    <form className="g-nudge" onSubmit={send}>
      <input
        type="text"
        inputMode="email"
        autoComplete="email"
        autoFocus
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t("e-mail pary (można dwa, po przecinku)", "couple's e-mail (up to two, comma-separated)")}
        aria-label={t("E-mail pary młodej", "Couple's e-mail")}
        maxLength={250}
      />
      <div className="g-nudge-row">
        <button type="submit" className="g-nudge-send" disabled={busy || !email.trim()}>
          {busy ? t("Wysyłam…", "Sending…") : t("Wyślij przypomnienie", "Send reminder")}
        </button>
        <button type="button" className="g-nudge-cancel" onClick={() => setOpen(false)}>
          {t("Anuluj", "Cancel")}
        </button>
      </div>
      <small>
        {t(
          "Para dostanie link do galerii, hasło i termin dostępu – oraz automatyczne przypomnienie 7 dni przed końcem.",
          "The couple gets the gallery link, password and access date – plus an automatic reminder 7 days before it ends.",
        )}
      </small>
      {error && (
        <small className="error" role="alert">
          {error}
        </small>
      )}
    </form>
  );
}
