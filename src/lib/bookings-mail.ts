import { sendEmail, emailLayout, siteUrl } from "@/lib/email";
import { getUserLang } from "@/lib/lang-server";
import type { BookingEvent, Reservation, Slot } from "@/lib/bookings";
import { slotLabel } from "@/lib/booking-format";
export { slotLabel };

type L = "pl" | "en";

const pageUrl = (e: BookingEvent) => `${siteUrl()}/rezerwacja/${e.id}`;

export async function mailBooked(e: BookingEvent, s: Slot, r: Reservation, studio: string | null, ownerEmail: string | null) {
  const en = e.lang === "en";
  const when = slotLabel(s, e.lang);
  const details = [
    `${en ? "When" : "Termin"}: ${when} (${e.duration} min)`,
    ...(e.location ? [`${en ? "Where" : "Miejsce"}: ${e.location}`] : []),
    ...(e.price ? [`${en ? "Price" : "Cena"}: ${e.price}`] : []),
  ];
  await sendEmail({
    to: r.email,
    subject: en ? `Booking confirmed – ${e.title}` : `Rezerwacja potwierdzona – ${e.title}`,
    html: emailLayout(
      en ? "Your session is booked" : "Twoja sesja jest zarezerwowana",
      [
        en ? `Thank you, ${r.name}! See you at “${e.title}”${studio ? ` with ${studio}` : ""}.` : `Dziękujemy, ${r.name}! Do zobaczenia na „${e.title}”${studio ? ` – ${studio}` : ""}.`,
        ...details,
        en
          ? `Can't make it? Cancel your booking here: ${pageUrl(e)}?anuluj=${s.id}&t=${r.token}`
          : `Nie możesz przyjść? Odwołaj rezerwację tutaj: ${pageUrl(e)}?anuluj=${s.id}&t=${r.token}`,
      ],
      { label: en ? "Add to calendar" : "Dodaj do kalendarza", url: `${siteUrl()}/api/rezerwacje/${e.id}/ics?slot=${s.id}` },
      e.lang,
    ),
  }).catch(() => undefined);

  if (ownerEmail) {
    const ol = await getUserLang(e.uid);
    const oen = ol === "en";
    await sendEmail({
      to: ownerEmail,
      subject: oen ? `New booking: ${r.name} – ${slotLabel(s, ol)}` : `Nowa rezerwacja: ${r.name} – ${slotLabel(s, ol)}`,
      html: emailLayout(
        oen ? "New booking" : "Nowa rezerwacja",
        [
          `${e.title}: ${slotLabel(s, ol)}`,
          `${r.name} · ${r.email}${r.phone ? ` · ${r.phone}` : ""}`,
          ...(r.note ? [`${oen ? "Message" : "Wiadomość"}: ${r.note}`] : []),
        ],
        { label: oen ? "See bookings" : "Zobacz rezerwacje", url: `${siteUrl()}/panel/rezerwacje/${e.id}` },
        ol,
      ),
    }).catch(() => undefined);
  }
}

// Fotograf odwołał termin – informujemy klienta
export async function mailCancelledByOwner(e: BookingEvent, s: Slot, r: Reservation, studio: string | null) {
  const en = e.lang === "en";
  await sendEmail({
    to: r.email,
    subject: en ? `Booking cancelled – ${e.title}` : `Rezerwacja odwołana – ${e.title}`,
    html: emailLayout(
      en ? "Your booking was cancelled" : "Twoja rezerwacja została odwołana",
      [
        en
          ? `${studio ?? "Your photographer"} cancelled your session on ${slotLabel(s, e.lang)}. You can choose another time if one is available.`
          : `${studio ?? "Fotograf"} odwołał(a) Twoją sesję w terminie: ${slotLabel(s, e.lang)}. Możesz wybrać inny wolny termin.`,
      ],
      { label: en ? "Choose another time" : "Wybierz inny termin", url: pageUrl(e) },
      e.lang,
    ),
  }).catch(() => undefined);
}

// Klient odwołał rezerwację – informujemy fotografa
export async function mailCancelledByClient(e: BookingEvent, s: Slot, r: Reservation, ownerEmail: string | null) {
  if (!ownerEmail) return;
  const ol = await getUserLang(e.uid);
  const oen = ol === "en";
  await sendEmail({
    to: ownerEmail,
    subject: oen ? `Booking cancelled: ${r.name} – ${slotLabel(s, ol)}` : `Odwołana rezerwacja: ${r.name} – ${slotLabel(s, ol)}`,
    html: emailLayout(
      oen ? "A client cancelled" : "Klient odwołał rezerwację",
      [
        oen
          ? `${r.name} cancelled “${e.title}” on ${slotLabel(s, ol)}. The time is free again.`
          : `${r.name} odwołał(a) „${e.title}” w terminie ${slotLabel(s, ol)}. Termin jest znów wolny.`,
      ],
      { label: oen ? "See bookings" : "Zobacz rezerwacje", url: `${siteUrl()}/panel/rezerwacje/${e.id}` },
      ol,
    ),
  }).catch(() => undefined);
}
