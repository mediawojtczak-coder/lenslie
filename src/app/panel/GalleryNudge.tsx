"use client";

import { useEffect, useRef, useState } from "react";
import { useTr, useLang } from "@/components/LangProvider";

const DAY = 24 * 3600 * 1000;
const REMIND_DAYS = 7; // jak COUPLE_REMIND_DAYS w lib/couple-mail
const valid = (v: string) =>
  v
    .split(/[,;\s]+/)
    .filter(Boolean)
    .every((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

// Na kafelku galerii, w jednej linii: e-mail klienta (zapisuje się sam) i data przypomnienia
export default function GalleryNudge({ id, email: initial, expiresAt, sent }: { id: string; email: string | null; expiresAt: string | null; sent: boolean }) {
  const t = useTr();
  const lang = useLang();
  const [email, setEmail] = useState(initial ?? "");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saved = useRef(initial ?? "");

  useEffect(() => {
    const v = email.trim();
    if (v === saved.current || (v && !valid(v))) return;
    const timer = setTimeout(async () => {
      setState("saving");
      try {
        const res = await fetch(`/api/galleries/${id}/nudge`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: v }) });
        if (!res.ok) throw new Error();
        saved.current = v;
        setState("saved");
      } catch {
        setState("error");
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [email, id]);

  // dzień wysyłki: 7 dni przed końcem dostępu (najwcześniej jutro rano)
  const when = expiresAt ? new Date(Math.max(new Date(expiresAt).getTime() - REMIND_DAYS * DAY, Date.now() + DAY)) : null;
  const loc = lang === "en" ? "en-GB" : "pl-PL";
  const long = (d: Date) => new Intl.DateTimeFormat(loc, { day: "numeric", month: "long", year: "numeric" }).format(d);
  const short = (d: Date) => new Intl.DateTimeFormat(loc, { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
  const v = email.trim();

  let tag = "";
  let tone: "ok" | "warn" | "" = "";
  let title = expiresAt ? t(`Przypomnimy klientowi mailem ${REMIND_DAYS} dni przed końcem dostępu`, `We will e-mail the client ${REMIND_DAYS} days before access ends`) : "";
  if (!v && expiresAt) tag = t(`${REMIND_DAYS} dni przed`, `${REMIND_DAYS} days before`);
  else if (state === "saving") tag = "…";
  else if (v && !valid(v)) {
    tag = t("sprawdź adres", "check address");
    tone = "warn";
    title = t("Sprawdź adres e-mail", "Check the e-mail address");
  } else if (state === "error") {
    tag = t("błąd zapisu", "not saved");
    tone = "warn";
    title = t("Nie udało się zapisać – spróbuj ponownie", "Could not save – try again");
  } else if (v && !expiresAt) {
    tag = t("zapisano", "saved");
    tone = "ok";
    title = t("Galeria nie wygasa – przypomnienie nie jest potrzebne", "The gallery doesn't expire – no reminder needed");
  } else if (v && sent && v === saved.current && state !== "saved") {
    tag = t("wysłane", "sent");
    tone = "ok";
    title = t("Przypomnienie zostało wysłane", "The reminder has been sent");
  } else if (v && when) {
    tag = short(when);
    tone = "ok";
    title = `${t("Przypomnienie dla klienta", "Reminder for the client")}: ${long(when)}`;
  }

  return (
    <div className="gn" title={title || undefined}>
      <label className="gn-field">
        <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
          <rect x="3.5" y="6" width="17" height="12" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <path d="m4 7 8 6 8-6" fill="none" stroke="currentColor" strokeWidth="1.2" />
        </svg>
        <input
          type="text"
          inputMode="email"
          autoComplete="off"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setState("idle");
          }}
          placeholder={t("e-mail klienta", "client e-mail")}
          aria-label={t("E-mail klienta", "Client e-mail")}
          maxLength={250}
        />
        {tag && (
          <span className={`gn-tag${tone ? ` gn-${tone}` : ""}`} aria-live="polite">
            {tone === "ok" && (
              <svg viewBox="0 0 24 24" width="11" height="11" aria-hidden="true">
                <path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {tag}
          </span>
        )}
      </label>
    </div>
  );
}
