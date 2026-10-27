import Link from "next/link";
import SideLogout from "@/components/SideLogout";
import { getUser } from "@/lib/supabase/server";
import { getLang } from "@/lib/lang-server";
import { tr, money } from "@/lib/lang";
import { listUserGuestEvents, guestActive, GUEST_PRICE, GUEST_LIMIT_GB } from "@/lib/guest-events";
import CreateGuestEvent from "./CreateGuestEvent";

export const dynamic = "force-dynamic";

// Lista wydarzeń „Zdjęcia od gości”
export default async function Goscie() {
  const { user } = await getUser();
  const lang = await getLang();
  const t = (pl: string, en: string) => tr(lang, pl, en);
  const events = await listUserGuestEvents(user!.id).catch(() => []);
  const fmt = new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "pl-PL", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="app-body">
      <aside className="app-side">
        <Link href="/panel" className="link-quiet back-link">← {t("Galerie", "Galleries")}</Link>
        <CreateGuestEvent label={t("Nowe wydarzenie", "New event")} className="btn btn-wide" />
        <nav aria-label={t("Zdjęcia od gości", "Guest uploads")}>
          <span className="side-link active">{t("Zdjęcia od gości", "Guest uploads")}</span>
        </nav>
        <SideLogout />
      </aside>
      <main className="app-main">
        <div className="app-head">
          <h1>{t("Zdjęcia od gości", "Guest uploads")}</h1>
        </div>
        {events.length === 0 ? (
          <div className="empty-state">
            <p>{t("Goście wesela wrzucają swoje zdjęcia z telefonów – po zeskanowaniu kodu QR ze stołu.", "Wedding guests upload their phone photos – after scanning a QR code on the table.")}</p>
            <p className="hint-inline">
              {t(
                `Bez aplikacji i logowania. ${money(GUEST_PRICE, lang)} za wydarzenie: rok dodawania i oglądania, do ${GUEST_LIMIT_GB} GB zdjęć, kartki z kodem QR do druku. Dolicz to do swojej oferty dla pary.`,
                `No app, no login. ${money(GUEST_PRICE, lang)} per event: a year of uploads and viewing, up to ${GUEST_LIMIT_GB} GB, printable QR table cards. Add it to your offer for the couple.`,
              )}
            </p>
            <CreateGuestEvent label={t("Utwórz wydarzenie", "Create an event")} className="btn" />
          </div>
        ) : (
          <ul className="booking-list">
            {events.map((e) => (
              <li key={e.id}>
                <Link href={`/panel/goscie/${e.id}`} className="booking-item">
                  <div>
                    <h2>{e.title}</h2>
                    <p>{e.date ? fmt.format(new Date(`${e.date}T12:00:00Z`)) : t("Bez daty", "No date")}</p>
                  </div>
                  <div className="booking-nums">
                    <span className={guestActive(e) ? "order-status paid" : "order-status"}>
                      {guestActive(e) ? t("Aktywne", "Active") : e.status === "draft" ? t("Do aktywacji", "Not activated") : t("Wygasło", "Expired")}
                    </span>
                    {e.expiresAt && <small>{t("do", "until")} {fmt.format(new Date(e.expiresAt))}</small>}
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
