"use client";

import { useState, type FormEvent } from "react";

export default function PortfolioContact({ slug, lang, preview = false }: { slug: string; lang: "pl" | "en"; preview?: boolean }) {
  const t = (pl: string, en: string) => (lang === "en" ? en : pl);
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle");
  const [error, setError] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (preview) return;
    const fd = new FormData(e.currentTarget);
    setState("busy");
    setError("");
    const res = await fetch(`/api/p/${slug}/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(fd.entries())),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (res?.ok) setState("sent");
    else {
      setState("idle");
      setError(data?.error ?? t("Nie udało się wysłać.", "Could not send."));
    }
  }

  if (state === "sent") {
    return <p className="pf-sent">{t("Dziękuję za wiadomość! Odpowiem najszybciej, jak to możliwe.", "Thank you for your message! I'll get back to you as soon as I can.")}</p>;
  }
  return (
    <form className="pf-form" onSubmit={submit}>
      <div className="pf-form-row">
        <div>
          <label htmlFor="cf-name">{t("Imię i nazwisko", "Full name")}</label>
          <input id="cf-name" name="name" required maxLength={80} autoComplete="name" />
        </div>
        <div>
          <label htmlFor="cf-email">E-mail</label>
          <input id="cf-email" name="email" type="email" required maxLength={120} autoComplete="email" />
        </div>
        <div>
          <label htmlFor="cf-phone">{t("Telefon (opcjonalnie)", "Phone (optional)")}</label>
          <input id="cf-phone" name="phone" type="tel" maxLength={30} autoComplete="tel" />
        </div>
        <div>
          <label htmlFor="cf-date">{t("Data wydarzenia", "Event date")}</label>
          <input id="cf-date" name="date" maxLength={40} placeholder={t("np. 12 września 2027", "e.g. 12 September 2027")} />
        </div>
      </div>
      <label htmlFor="cf-msg">{t("Wiadomość", "Message")}</label>
      <textarea id="cf-msg" name="message" rows={5} required maxLength={3000} className="modal-textarea" />
      <input name="website" tabIndex={-1} autoComplete="off" className="pf-hp" aria-hidden="true" />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="pf-send" disabled={state === "busy"}>
        {state === "busy" ? t("Wysyłam…", "Sending…") : t("Wyślij zapytanie", "Send enquiry")}
      </button>
    </form>
  );
}
