"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/components/LangProvider";
import { tr } from "@/lib/lang";
import { dayLabel } from "@/lib/booking-format";

type Ev = { id: string; title: string; description: string; location: string; price: string; duration: number; lang: "pl" | "en"; open: boolean };
type SlotRow = { id: string; date: string; time: string; past: boolean; booking: { name: string; email: string; phone: string; note: string } | null };

async function api(body: Record<string, unknown>) {
  const res = await fetch("/api/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Error");
  return data;
}

export default function BookingEditor({ event, slots, publicUrl }: { event: Ev; slots: SlotRow[]; publicUrl: string }) {
  const lang = useLang();
  const t = (pl: string, en: string) => tr(lang, pl, en);
  const router = useRouter();
  const [ev, setEv] = useState(event);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ where: string; ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Warsaw" });
  const [date, setDate] = useState(today);
  const [from, setFrom] = useState("10:00");
  const [to, setTo] = useState("14:00");
  const [every, setEvery] = useState(String(event.duration + 10));

  async function run(where: string, body: Record<string, unknown>, ok?: string) {
    setBusy(where);
    setMsg(null);
    try {
      const data = await api({ id: ev.id, ...body });
      if (ok) setMsg({ where, ok: true, text: typeof data.added === "number" ? `${ok}: ${data.added}` : ok });
      router.refresh();
      return true;
    } catch (err) {
      setMsg({ where, ok: false, text: err instanceof Error ? err.message : "Error" });
      return false;
    } finally {
      setBusy("");
    }
  }

  const note = (where: string) =>
    msg?.where === where ? (
      <p className={msg.ok ? "success" : "error"} role={msg.ok ? undefined : "alert"}>
        {msg.text}
      </p>
    ) : null;

  const visible = slots.filter((s) => showPast || !s.past);
  const days = useMemo(() => {
    const m = new Map<string, SlotRow[]>();
    for (const s of visible) m.set(s.date, [...(m.get(s.date) ?? []), s]);
    return [...m.entries()];
  }, [visible]);
  const booked = slots.filter((s) => s.booking && !s.past).length;
  const free = slots.filter((s) => !s.booking && !s.past).length;
  const pastCount = slots.filter((s) => s.past).length;

  return (
    <div className="settings">
      <section className="share-bar">
        <div className="share-status">
          <span className={ev.open && free > 0 ? "dot" : "dot dot-off"} aria-hidden="true" />
          <div>
            <p className="share-label">{ev.open ? t("Zapisy otwarte", "Bookings open") : t("Zapisy zamknięte", "Bookings closed")}</p>
            <p className="share-note">
              {booked} {t("zarezerwowanych", "booked")} · {free} {t("wolnych terminów", "free slots")}
            </p>
          </div>
        </div>
        <div className="share-actions">
          <a href={publicUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-small">
            {t("Podgląd", "Preview")}
          </a>
          <button
            type="button"
            className="btn btn-small"
            onClick={async () => {
              await navigator.clipboard.writeText(publicUrl).catch(() => undefined);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? t("Skopiowano", "Copied") : t("Kopiuj link dla klientów", "Copy link for clients")}
          </button>
        </div>
      </section>

      <div className="settings-card">
        <h2>{t("Terminy", "Time slots")}</h2>
        <form
          className="slot-gen"
          onSubmit={(e) => {
            e.preventDefault();
            run("slots", { action: "add-slots", date, from, to, every }, t("Dodano terminy", "Slots added"));
          }}
        >
          <div>
            <label htmlFor="sg-date">{t("Dzień", "Day")}</label>
            <input id="sg-date" type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div>
            <label htmlFor="sg-from">{t("Od", "From")}</label>
            <input id="sg-from" type="time" value={from} onChange={(e) => setFrom(e.target.value)} required />
          </div>
          <div>
            <label htmlFor="sg-to">{t("Do", "To")}</label>
            <input id="sg-to" type="time" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <label htmlFor="sg-every">{t("Co (min)", "Every (min)")}</label>
            <input id="sg-every" type="number" min={5} max={480} value={every} onChange={(e) => setEvery(e.target.value)} />
          </div>
          <button type="submit" className="btn" disabled={busy === "slots"}>
            {busy === "slots" ? t("Dodaję…", "Adding…") : t("Dodaj terminy", "Add slots")}
          </button>
        </form>
        <p className="hint-inline">
          {t(
            "Np. 10:00–14:00 co 30 min daje 8 terminów. Zostaw „Do” puste, aby dodać jeden termin.",
            "E.g. 10:00–14:00 every 30 min gives 8 slots. Leave “To” empty to add a single slot.",
          )}
        </p>
        {note("slots")}

        {days.length === 0 ? (
          <p className="hint-inline">{t("Nie ma jeszcze terminów.", "No time slots yet.")}</p>
        ) : (
          <div className="slot-days">
            {days.map(([d, list]) => (
              <section key={d} className="slot-day">
                <h3>{dayLabel(d, lang)}</h3>
                <ul>
                  {list.map((s) => (
                    <li key={s.id} className={`slot-row${s.booking ? " booked" : ""}${s.past ? " past" : ""}`}>
                      <span className="slot-time">{s.time}</span>
                      {s.booking ? (
                        <span className="slot-who">
                          <strong>{s.booking.name}</strong>
                          <small>
                            <a href={`mailto:${s.booking.email}`}>{s.booking.email}</a>
                            {s.booking.phone && (
                              <>
                                {" · "}
                                <a href={`tel:${s.booking.phone.replace(/\s/g, "")}`}>{s.booking.phone}</a>
                              </>
                            )}
                          </small>
                          {s.booking.note && <em>{s.booking.note}</em>}
                        </span>
                      ) : (
                        <span className="slot-who free">{t("wolny", "free")}</span>
                      )}
                      {!s.past &&
                        (s.booking ? (
                          <button
                            type="button"
                            className="as-link danger"
                            disabled={Boolean(busy)}
                            onClick={() =>
                              window.confirm(t(`Odwołać rezerwację ${s.booking!.name}? Klient dostanie maila.`, `Cancel ${s.booking!.name}'s booking? They will get an email.`)) &&
                              run("slots", { action: "cancel", slot: s.id })
                            }
                          >
                            {t("Odwołaj", "Cancel")}
                          </button>
                        ) : (
                          <button type="button" className="as-link" disabled={Boolean(busy)} onClick={() => run("slots", { action: "remove-slot", slot: s.id })}>
                            {t("Usuń", "Remove")}
                          </button>
                        ))}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
        {pastCount > 0 && (
          <button type="button" className="as-link" onClick={() => setShowPast((v) => !v)}>
            {showPast ? t("Ukryj minione terminy", "Hide past slots") : `${t("Pokaż minione terminy", "Show past slots")} (${pastCount})`}
          </button>
        )}
      </div>

      <form
        className="settings-card"
        onSubmit={(e) => {
          e.preventDefault();
          run("settings", { action: "save", ...ev }, t("Zapisano.", "Saved."));
        }}
      >
        <h2>{t("Opis dla klientów", "Details for clients")}</h2>
        <label className="check">
          <input type="checkbox" checked={ev.open} onChange={(e) => setEv({ ...ev, open: e.target.checked })} />
          {t("Zapisy otwarte – klienci mogą rezerwować terminy", "Bookings open – clients can book time slots")}
        </label>
        <label htmlFor="be-title">{t("Nazwa", "Name")}</label>
        <input id="be-title" value={ev.title} maxLength={100} onChange={(e) => setEv({ ...ev, title: e.target.value })} required />
        <label htmlFor="be-desc">{t("Opis", "Description")}</label>
        <textarea
          id="be-desc"
          rows={4}
          maxLength={2000}
          value={ev.description}
          onChange={(e) => setEv({ ...ev, description: e.target.value })}
          placeholder={t("np. 20 minut w świątecznej scenografii, 10 zdjęć w cenie, galeria online w 7 dni.", "e.g. 20 minutes in a Christmas set, 10 photos included, online gallery within 7 days.")}
        />
        <div className="sale-fields">
          <div>
            <label htmlFor="be-loc">{t("Miejsce", "Location")}</label>
            <input id="be-loc" value={ev.location} maxLength={200} onChange={(e) => setEv({ ...ev, location: e.target.value })} placeholder={t("np. Studio, ul. Polna 5, Poznań", "e.g. Studio, 5 Field St, London")} />
          </div>
          <div>
            <label htmlFor="be-price">{t("Cena", "Price")}</label>
            <input id="be-price" value={ev.price} maxLength={100} onChange={(e) => setEv({ ...ev, price: e.target.value })} placeholder={t("np. 350 zł, płatne na miejscu", "e.g. PLN 350, paid on the day")} />
          </div>
          <div>
            <label htmlFor="be-dur">{t("Czas sesji (min)", "Session length (min)")}</label>
            <input id="be-dur" type="number" min={5} max={600} value={ev.duration} onChange={(e) => setEv({ ...ev, duration: Number(e.target.value) })} />
          </div>
          <div>
            <label htmlFor="be-lang">{t("Język strony rezerwacji", "Booking page language")}</label>
            <select id="be-lang" className="plain-select" value={ev.lang} onChange={(e) => setEv({ ...ev, lang: e.target.value as "pl" | "en" })}>
              <option value="pl">Polski</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
        {note("settings")}
        <button type="submit" className="btn" disabled={busy === "settings"}>
          {busy === "settings" ? t("Zapisuję…", "Saving…") : t("Zapisz", "Save")}
        </button>
      </form>

      <div className="settings-card danger">
        <h2>{t("Usuń kalendarz", "Delete calendar")}</h2>
        <p>{t("Usuwa kalendarz z terminami i rezerwacjami. Link dla klientów przestanie działać.", "Deletes the calendar with its slots and bookings. The client link will stop working.")}</p>
        {note("delete")}
        <button
          type="button"
          className="btn btn-danger"
          disabled={Boolean(busy)}
          onClick={async () => {
            if (!window.confirm(t(`Usunąć „${event.title}”?`, `Delete “${event.title}”?`))) return;
            if (await run("delete", { action: "delete" })) router.push("/panel/rezerwacje");
          }}
        >
          {t("Usuń kalendarz", "Delete calendar")}
        </button>
      </div>
    </div>
  );
}
