import { notFound } from "next/navigation";
import { getEvent, listReservations, slotPast } from "@/lib/bookings";
import { getUserBrand } from "@/lib/profiles";
import BookingPage from "./BookingPage";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

// Publiczna strona rezerwacji terminu sesji
export default async function Rezerwacja({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ anuluj?: string; t?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const e = await getEvent(id);
  if (!e) notFound();
  const [res, brand] = await Promise.all([listReservations(e.id), getUserBrand(e.uid).catch(() => null)]);
  const cancelSlot = sp.anuluj ? e.slots.find((s) => s.id === sp.anuluj) : undefined;

  return (
    <BookingPage
      event={{ id: e.id, title: e.title, description: e.description, location: e.location, price: e.price, duration: e.duration, lang: e.lang, open: e.open }}
      slots={e.slots.filter((s) => !slotPast(s)).map((s) => ({ id: s.id, date: s.date, time: s.time, free: !res.has(s.id) }))}
      studio={brand?.studioName ?? null}
      logo={brand?.logoUrl ?? null}
      cancel={cancelSlot && sp.t ? { slot: cancelSlot.id, date: cancelSlot.date, time: cancelSlot.time, token: sp.t, active: res.get(cancelSlot.id)?.token === sp.t } : null}
    />
  );
}
