"use client";

import { useState } from "react";
import { money } from "@/lib/lang";

type Offer = {
  expiresAt: string;
  expired: boolean;
  daysLeft: number;
  deleteOn: string;
  prices: { period: number; amount: number }[];
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
  },
};

// Informacja dla klienta, ile dni zostało, i samodzielne przedłużenie dostępu
export default function ExtendAccess({ id, offer, lang }: { id: string; offer: Offer; lang: "pl" | "en" }) {
  const t = L[lang];
  const fmt = new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "pl-PL", { day: "numeric", month: "long", year: "numeric" });
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState(offer.prices.find((p) => p.period === 12)?.period ?? offer.prices[0].period);
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
        <button type="button" className="g-expiry-btn" onClick={() => setOpen(true)}>
          {t.extend}
        </button>
      </div>
      {open && (
        <div className="ext-modal" role="dialog" aria-modal="true" aria-labelledby="ext-title" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="ext-box">
            <button type="button" className="ext-close" aria-label={t.close} onClick={() => setOpen(false)}>
              ×
            </button>
            <h2 id="ext-title">{t.title}</h2>
            <p className="ext-lead">{t.lead}</p>
            {form}
          </div>
        </div>
      )}
    </>
  );
}
