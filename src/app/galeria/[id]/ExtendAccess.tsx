"use client";

import { useState } from "react";
import { money } from "@/lib/lang";

type Offer = {
  expiresAt: string;
  expired: boolean;
  daysLeft: number;
  deleteOn: string;
  prices: { period: number; amount: number }[];
  canExtend: boolean;
};

const L = {
  pl: {
    left: (n: number) => (n <= 0 ? "Galeria wygasa dziś" : n === 1 ? "Galeria dostępna jeszcze 1 dzień" : `Galeria dostępna jeszcze ${n} dni`),
    until: "do",
    extend: "Przedłuż dostęp",
    title: "Przedłuż dostęp do galerii",
    lead: "Wybierz, na jak długo galeria ma pozostać dostępna. Zdjęcia, filmy i ulubione zostają bez zmian, link i hasło też.",
    expiredTitle: "Dostęp do galerii wygasł",
    expiredLead: (d: string) => `Zdjęcia przechowujemy jeszcze do ${d}. Przedłuż dostęp, a galeria wróci od razu – w całości, pod tym samym linkiem.`,
    months: (p: number) => (p === 1 ? "1 miesiąc" : p < 5 ? `${p} miesiące` : `${p} miesięcy`),
    email: "Twój e-mail (potwierdzenie płatności)",
    pay: (a: string) => `Zapłać ${a}`,
    note: "Płatność BLIK, kartą lub przelewem przez Przelewy24. Nowy okres liczy się od końca obecnego.",
    close: "Zamknij",
    wait: "Przekierowuję do płatności…",
    fail: "Nie udało się rozpocząć płatności.",
    remind: "Przypomnij mi",
    remindTitle: "Przypomnienie o końcu galerii",
    remindLead: "Wyślemy Ci maila przed końcem dostępu, żebyś zdążył(a) pobrać zdjęcia albo przedłużyć galerię.",
    remindWhen: "Kiedy przypomnieć?",
    before: (d: number) => `${d} dni przed`,
    remindEmail: "Twój e-mail",
    remindSave: "Ustaw przypomnienie",
    remindOk: (e: string) => `Gotowe – przypomnimy na ${e}.`,
    remindFail: "Nie udało się ustawić przypomnienia.",
  },
  en: {
    left: (n: number) => (n <= 0 ? "The gallery expires today" : n === 1 ? "Gallery available for 1 more day" : `Gallery available for ${n} more days`),
    until: "until",
    extend: "Extend access",
    title: "Extend gallery access",
    lead: "Choose how long the gallery should stay available. Photos, videos and favourites stay as they are, and so do the link and password.",
    expiredTitle: "Gallery access has expired",
    expiredLead: (d: string) => `We keep the photos until ${d}. Extend access and the gallery comes back right away – complete, at the same link.`,
    months: (p: number) => (p === 1 ? "1 month" : `${p} months`),
    email: "Your e-mail (payment confirmation)",
    pay: (a: string) => `Pay ${a}`,
    note: "Pay by card, BLIK or bank transfer via Przelewy24. The new period starts when the current one ends.",
    close: "Close",
    wait: "Redirecting to payment…",
    fail: "Could not start the payment.",
    remind: "Remind me",
    remindTitle: "Gallery expiry reminder",
    remindLead: "We'll e-mail you before access ends, so you have time to download the photos or extend the gallery.",
    remindWhen: "When should we remind you?",
    before: (d: number) => `${d} days before`,
    remindEmail: "Your e-mail",
    remindSave: "Set reminder",
    remindOk: (e: string) => `Done – we'll remind you at ${e}.`,
    remindFail: "Could not set the reminder.",
  },
};

// Informacja dla klienta, ile dni zostało, i samodzielne przedłużenie dostępu
export default function ExtendAccess({ id, offer, lang }: { id: string; offer: Offer; lang: "pl" | "en" }) {
  const t = L[lang];
  const fmt = new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "pl-PL", { day: "numeric", month: "long", year: "numeric" });
  const [open, setOpen] = useState<null | "extend" | "remind">(null);
  const [period, setPeriod] = useState(offer.prices.find((p) => p.period === 12)?.period ?? offer.prices[0]?.period ?? 12);
  const dayOpts = [3, 7, 14].filter((d) => d < offer.daysLeft);
  const [days, setDays] = useState(dayOpts.includes(7) ? 7 : (dayOpts[dayOpts.length - 1] ?? 3));
  const [reminded, setReminded] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const amount = offer.prices.find((p) => p.period === period)?.amount ?? 0;
  const soon = offer.daysLeft <= 30;

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/galleries/${id}/extend`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept-Language": lang },
        body: JSON.stringify({ period, email }),
      });
      const data = await res.json();
      if (!res.ok || !data.redirect) throw new Error(data.error ?? t.fail);
      window.location.href = data.redirect;
    } catch (err) {
      setError(err instanceof Error ? err.message : t.fail);
      setBusy(false);
    }
  }

  async function remind(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/galleries/${id}/reminder`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept-Language": lang },
        body: JSON.stringify({ days, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.remindFail);
      setReminded(email);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.remindFail);
    } finally {
      setBusy(false);
    }
  }

  const remindForm = reminded ? (
    <p className="success">{t.remindOk(reminded)}</p>
  ) : (
    <form className="ext-form" onSubmit={remind}>
      <p className="ext-sub">{t.remindWhen}</p>
      <div className="ext-periods three" role="radiogroup">
        {dayOpts.map((d) => (
          <button key={d} type="button" role="radio" aria-checked={days === d} className={days === d ? "ext-period on" : "ext-period"} onClick={() => setDays(d)}>
            <strong>{t.before(d)}</strong>
          </button>
        ))}
      </div>
      <label htmlFor="rem-email">{t.remindEmail}</label>
      <input id="rem-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-dark btn-wide" disabled={busy}>
        {t.remindSave}
      </button>
    </form>
  );

  const form = (
    <form className="ext-form" onSubmit={pay}>
      <div className="ext-periods" role="radiogroup">
        {offer.prices.map((p) => (
          <button
            key={p.period}
            type="button"
            role="radio"
            aria-checked={period === p.period}
            className={period === p.period ? "ext-period on" : "ext-period"}
            onClick={() => setPeriod(p.period)}
          >
            <span>{t.months(p.period)}</span>
            <strong>{money(p.amount, lang)}</strong>
          </button>
        ))}
      </div>
      <label htmlFor="ext-email">{t.email}</label>
      <input id="ext-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-dark btn-wide" disabled={busy}>
        {busy ? t.wait : t.pay(money(amount, lang))}
      </button>
      <p className="ext-note">{t.note}</p>
    </form>
  );

  if (offer.expired) {
    if (!offer.canExtend) return null;
    return (
      <div className="ext-expired">
        <h2>{t.expiredTitle}</h2>
        <p>{t.expiredLead(fmt.format(new Date(offer.deleteOn)))}</p>
        {form}
      </div>
    );
  }

  return (
    <>
      <div className={soon ? "g-expiry soon" : "g-expiry"}>
        <span>
          <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12 7v5l3 2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {t.left(offer.daysLeft)} <small>· {t.until} {fmt.format(new Date(offer.expiresAt))}</small>
        </span>
        <span className="g-expiry-acts">
          {offer.daysLeft > 3 && (
            <button type="button" className="g-expiry-btn ghost" onClick={() => { setError(""); setOpen("remind"); }}>
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16ZM10 20a2 2 0 0 0 4 0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
              {t.remind}
            </button>
          )}
          {offer.canExtend && (
            <button type="button" className="g-expiry-btn" onClick={() => { setError(""); setOpen("extend"); }}>
              {t.extend}
            </button>
          )}
        </span>
      </div>
      {open && (
        <div className="ext-modal" role="dialog" aria-modal="true" aria-labelledby="ext-title" onClick={(e) => e.target === e.currentTarget && setOpen(null)}>
          <div className="ext-box">
            <button type="button" className="ext-close" aria-label={t.close} onClick={() => setOpen(null)}>
              ×
            </button>
            <h2 id="ext-title">{open === "remind" ? t.remindTitle : t.title}</h2>
            <p className="ext-lead">{open === "remind" ? t.remindLead : t.lead}</p>
            {open === "remind" ? remindForm : form}
          </div>
        </div>
      )}
    </>
  );
}
