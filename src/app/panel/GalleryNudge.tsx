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

// Na kafelku galerii: e-mail pary młodej (zapisuje się sam) i krótka informacja, kiedy wyślemy im przypomnienie
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
  const fmt = (d: Date) => new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "pl-PL", { day: "numeric", month: "short", year: "numeric" }).format(d);
  const v = email.trim();

  let info: string;
  let ok = false;
  if (v && !valid(v)) info = t("sprawdź adres e-mail", "check the e-mail address");
  else if (state === "error") info = t("nie udało się zapisać – spróbuj ponownie", "could not save – try again");
  else if (!v) info = expiresAt ? t(`przypomnimy ${REMIND_DAYS} dni przed końcem`, `reminder ${REMIND_DAYS} days before the end`) : t("wpisz e-mail pary", "enter the couple e-mail");
  else if (!expiresAt) info = t("zapisano · galeria nie wygasa", "saved · gallery does not expire");
  else if (sent && v === saved.current && state !== "saved") {
    info = t("przypomnienie wysłane", "reminder sent");
    ok = true;
  } else {
    info = `${t("przypomnienie", "reminder")} ${fmt(when!)}`;
    ok = true;
  }

  return (
    <div className="gn">
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
          placeholder={t("e-mail pary młodej", "the couple's e-mail")}
          aria-label={t("E-mail pary młodej", "The couple's e-mail")}
          maxLength={250}
        />
      </label>
      <p className={ok ? "gn-info gn-ok" : "gn-info"} aria-live="polite">
        {ok && (
          <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
            <path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {state === "saving" ? t("zapisuję…", "saving…") : info}
      </p>
    </div>
  );
}
