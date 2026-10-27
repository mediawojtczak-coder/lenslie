import Link from "next/link";
import SideLogout from "@/components/SideLogout";
import { getUser } from "@/lib/supabase/server";
import { getLang } from "@/lib/lang-server";
import { tr } from "@/lib/lang";
import { listUserEvents, listReservations, slotPast } from "@/lib/bookings";
import { slotLabel } from "@/lib/bookings-mail";
import CreateBooking from "./CreateBooking";

export const dynamic = "force-dynamic";

// Lista kalendarzy rezerwacji fotografa
export default async function Rezerwacje() {
  const { user } = await getUser();
  const lang = await getLang();
  const t = (pl: string, en: string) => tr(lang, pl, en);
  const events = await listUserEvents(user!.id).catch(() => []);
  const stats = await Promise.all(
    events.map(async (e) => {
      const res = await listReservations(e.id);
      const upcoming = e.slots.filter((s) => !slotPast(s));
      return { booked: upcoming.filter((s) => res.has(s.id)).length, free: upcoming.filter((s) => !res.has(s.id)).length, next: upcoming[0] };
    }),
  );

  return (
    <div className="app-body">
      <aside className="app-side">
        <Link href="/panel" className="link-quiet back-link">← {t("Galerie", "Galleries")}</Link>
        <CreateBooking label={t("Nowy kalendarz", "New calendar")} className="btn btn-wide" />
        <nav aria-label={t("Rezerwacje", "Bookings")}>
          <span className="side-link active">{t("Rezerwacje sesji", "Session bookings")}</span>
        </nav>
        <SideLogout />
      </aside>
      <main className="app-main">
        <div className="app-head">
          <h1>{t("Rezerwacje sesji", "Session bookings")}</h1>
        </div>
        {events.length === 0 ? (
          <div className="empty-state">
            <p>{t("Nie masz jeszcze kalendarza rezerwacji.", "You don't have a booking calendar yet.")}</p>
            <p className="hint-inline">
              {t(
                "Utwórz np. „Mini sesje świąteczne”, dodaj terminy i wyślij klientom link – sami wybiorą wolną godzinę, a Ty dostaniesz maila.",
                "Create e.g. “Christmas mini sessions”, add time slots and send clients the link – they pick a free time and you get an email.",
              )}
            </p>
            <CreateBooking label={t("Utwórz kalendarz", "Create a calendar")} className="btn" />
          </div>
        ) : (
          <ul className="booking-list">
            {events.map((e, i) => (
              <li key={e.id}>
                <Link href={`/panel/rezerwacje/${e.id}`} className="booking-item">
                  <div>
                    <h2>{e.title}</h2>
                    <p>
                      {stats[i].next ? `${t("Najbliższy termin", "Next slot")}: ${slotLabel(stats[i].next!, lang)}` : t("Brak nadchodzących terminów", "No upcoming slots")}
                    </p>
                  </div>
                  <div className="booking-nums">
                    <span className={e.open ? "order-status paid" : "order-status"}>{e.open ? t("Zapisy otwarte", "Open") : t("Zamknięte", "Closed")}</span>
                    <small>
                      {stats[i].booked} {t("zarezerwowanych", "booked")} · {stats[i].free} {t("wolnych", "free")}
                    </small>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
