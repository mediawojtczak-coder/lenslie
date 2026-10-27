"use client";

import { useMemo, useState, type FormEvent } from "react";
import { dayLabel, slotLabel } from "@/lib/booking-format";

type Ev = { id: string; title: string; description: string; location: string; price: string; duration: number; lang: "pl" | "en"; open: boolean };
type S = { id: string; date: string; time: string; free: boolean };
type Cancel = { slot: string; date: string; time: string; token: string; active: boolean };

export default function BookingPage({ event, slots: initial, studio, logo, cancel }: { event: Ev; slots: S[]; studio: string | null; logo: string | null; cancel: Cancel | null }) {
  const lang = event.lang;
  const t = (pl: string, en: string) => (lang === "en" ? en : pl);
  const [slots, setSlots] = useState(initial);
  const days = useMemo(() => {
    const m = new Map<string, S[]>();
    for (const s of slots) m.set(s.date, [...(m.get(s.date) ?? []), s]);
    return [...m.entries()];
  }, [slots]);
  const firstFree = days.find(([, l]) => l.some((s) => s.free))?.[0] ?? days[0]?.[0] ?? "";
  const [day, setDay] = useState(firstFree);
  const [picked, setPicked] = useState<S | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<S | null>(null);
  const [cancelState, setCancelState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const freeCount = slots.filter((s) => s.free).length;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!picked) return;
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/rezerwacje/${event.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot: picked.id, name: fd.get("name"), email: fd.get("email"), phone: fd.get("phone"), note: fd.get("note") }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.code === "TAKEN") {
          setSlots((list) => list.map((s) => (s.id === picked.id ? { ...s, free: false } : s)));
          setPicked(null);
        }
        throw new Error(data.error ?? t("Nie udało się zarezerwować.", "Could not book."));
      }
      setDone(picked);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Nie udało się zarezerwować.", "Could not book."));
    } finally {
      setBusy(false);
    }
  }

  async function doCancel() {
    if (!cancel) return;
    setCancelState("busy");
    const res = await fetch(`/api/rezerwacje/${event.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel", slot: cancel.slot, token: cancel.token }),
    }).catch(() => null);
    setCancelState(res?.ok ? "done" : "error");
  }

  const head = (
    <header className="bk-head">
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt={studio ?? ""} className="bk-logo" />
      ) : (
        <p className="wordmark">{studio ?? "Lenslie"}</p>
      )}
      <p className="bk-kicker">{t("Rezerwacja sesji", "Book a session")}</p>
      <h1>{event.title}</h1>
      {event.description && <p className="bk-desc">{event.description}</p>}
      <p className="bk-meta">
        {[`${event.duration} min`, event.location, event.price].filter(Boolean).map((x, i) => (
          <span key={i}>{x}</span>
        ))}
      </p>
    </header>
  );

  if (cancel) {
    return (
      <main className="bk-page">
        {head}
        <section className="bk-card bk-center">
          {cancelState === "done" ? (
            <>
              <h2>{t("Rezerwacja odwołana", "Booking cancelled")}</h2>
              <p>{t("Daliśmy znać fotografowi. Termin jest znów wolny.", "We've let your photographer know. The time is free again.")}</p>
              <a className="btn" href={`/rezerwacja/${event.id}`}>{t("Wybierz inny termin", "Choose another time")}</a>
            </>
          ) : cancel.active ? (
            <>
              <h2>{t("Odwołać rezerwację?", "Cancel your booking?")}</h2>
              <p>{slotLabel(cancel, lang)}</p>
              {cancelState === "error" && <p className="error">{t("Nie udało się odwołać. Spróbuj ponownie.", "Could not cancel. Please try again.")}</p>}
              <button type="button" className="btn btn-danger" onClick={doCancel} disabled={cancelState === "busy"}>
                {t("Tak, odwołuję", "Yes, cancel it")}
              </button>
            </>
          ) : (
            <>
              <h2>{t("Ta rezerwacja jest już nieaktualna", "This booking is no longer active")}</h2>
              <a className="btn btn-ghost" href={`/rezerwacja/${event.id}`}>{t("Zobacz terminy", "See available times")}</a>
            </>
          )}
        </section>
      </main>
    );
  }

  if (done) {
    return (
      <main className="bk-page">
        {head}
        <section className="bk-card bk-center">
          <span className="bk-check" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="28" height="28">
              <path d="M6 12.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <h2>{t("Do zobaczenia!", "See you soon!")}</h2>
          <p className="bk-when">{slotLabel(done, lang)}</p>
          <p>{t("Potwierdzenie wysłaliśmy na Twój e-mail. Znajdziesz w nim też link do odwołania rezerwacji.", "We've emailed you a confirmation, with a link to cancel if needed.")}</p>
          <a className="btn" href={`/api/rezerwacje/${event.id}/ics?slot=${done.id}`}>
            {t("Dodaj do kalendarza", "Add to calendar")}
          </a>
        </section>
      </main>
    );
  }

  const daySlots = days.find(([d]) => d === day)?.[1] ?? [];

  return (
    <main className="bk-page">
      {head}
      {!event.open || freeCount === 0 ? (
        <section className="bk-card bk-center">
          <h2>{event.open ? t("Wszystkie terminy są zajęte", "All times are booked") : t("Zapisy są zamknięte", "Bookings are closed")}</h2>
          <p>{t("Skontaktuj się z fotografem, jeśli chcesz umówić inny termin.", "Please contact your photographer to arrange another time.")}</p>
        </section>
      ) : (
        <section className="bk-card">
          <h2>{t("Wybierz dzień", "Choose a day")}</h2>
          <div className="bk-days" role="tablist">
            {days.map(([d, list]) => {
              const n = list.filter((s) => s.free).length;
              return (
                <button
                  key={d}
                  type="button"
                  role="tab"
                  aria-selected={day === d}
                  className={day === d ? "bk-day active" : "bk-day"}
                  disabled={n === 0}
                  onClick={() => {
                    setDay(d);
                    setPicked(null);
                  }}
                >
                  <span>{dayLabel(d, lang, false)}</span>
                  <small>{n === 0 ? t("brak miejsc", "full") : `${n} ${t(n === 1 ? "wolny" : "wolne", "free")}`}</small>
                </button>
              );
            })}
          </div>

          <h2>{t("Wybierz godzinę", "Choose a time")}</h2>
          <div className="bk-times">
            {daySlots.map((s) => (
              <button
                key={s.id}
                type="button"
                className={picked?.id === s.id ? "bk-time active" : "bk-time"}
                disabled={!s.free}
                onClick={() => {
                  setPicked(s);
                  setError("");
                }}
              >
                {s.time}
              </button>
            ))}
          </div>

          {picked && (
            <form className="bk-form" onSubmit={submit}>
              <p className="bk-when">{slotLabel(picked, lang)}</p>
              <label htmlFor="bk-name">{t("Imię i nazwisko", "Full name")}</label>
              <input id="bk-name" name="name" required maxLength={80} autoComplete="name" />
              <label htmlFor="bk-email">{t("E-mail", "Email")}</label>
              <input id="bk-email" name="email" type="email" required maxLength={120} autoComplete="email" />
              <label htmlFor="bk-phone">{t("Telefon (opcjonalnie)", "Phone (optional)")}</label>
              <input id="bk-phone" name="phone" type="tel" maxLength={30} autoComplete="tel" />
              <label htmlFor="bk-note">{t("Wiadomość (opcjonalnie)", "Message (optional)")}</label>
              <textarea id="bk-note" name="note" rows={3} maxLength={1000} className="modal-textarea" placeholder={t("np. liczba osób, wiek dzieci", "e.g. number of people, children's ages")} />
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <button type="submit" className="btn btn-wide" disabled={busy}>
                {busy ? t("Rezerwuję…", "Booking…") : t("Rezerwuję termin", "Book this time")}
              </button>
            </form>
          )}
        </section>
      )}
      <footer className="bk-foot">
        <a href="https://www.lenslie.com">{t("Rezerwacje w Lenslie", "Bookings by Lenslie")}</a>
      </footer>
    </main>
  );
}
