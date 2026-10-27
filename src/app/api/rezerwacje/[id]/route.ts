import { NextResponse } from "next/server";
import { getEvent, getReservation, reserve, cancelReservation, slotPast, newToken, type Reservation } from "@/lib/bookings";
import { getUserBrand } from "@/lib/profiles";
import { mailBooked, mailCancelledByClient } from "@/lib/bookings-mail";

export const runtime = "nodejs";

// Publiczna rezerwacja terminu przez klienta i odwołanie z linku w mailu
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = await getEvent(id);
  if (!e) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const en = e.lang === "en";
  const msg = (pl: string, eng: string) => (en ? eng : pl);
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: msg("Nieprawidłowe dane.", "Invalid data.") }, { status: 400 });
  const slot = e.slots.find((s) => s.id === String(body.slot ?? ""));
  if (!slot) return NextResponse.json({ error: msg("Nie ma takiego terminu.", "This time does not exist.") }, { status: 404 });

  if (body.action === "cancel") {
    const r = await getReservation(e.id, slot.id);
    if (!r || r.token !== String(body.token ?? "")) {
      return NextResponse.json({ error: msg("Ta rezerwacja została już odwołana.", "This booking has already been cancelled.") }, { status: 404 });
    }
    await cancelReservation(e.id, slot.id);
    const brand = await getUserBrand(e.uid).catch(() => null);
    await mailCancelledByClient(e, slot, r, brand?.email ?? null);
    return NextResponse.json({ ok: true });
  }

  if (!e.open) return NextResponse.json({ error: msg("Zapisy są zamknięte.", "Bookings are closed.") }, { status: 403 });
  if (slotPast(slot)) return NextResponse.json({ error: msg("Ten termin już minął.", "This time has passed.") }, { status: 400 });
  const name = String(body.name ?? "").trim().slice(0, 80);
  const email = String(body.email ?? "").trim().slice(0, 120);
  const phone = String(body.phone ?? "").trim().slice(0, 30);
  const note = String(body.note ?? "").trim().slice(0, 1000);
  if (!name) return NextResponse.json({ error: msg("Wpisz imię i nazwisko.", "Enter your name.") }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: msg("Sprawdź adres e-mail.", "Check your email address.") }, { status: 400 });

  const r: Reservation = { slot: slot.id, name, email, phone, note, at: new Date().toISOString(), token: newToken() };
  const taken = Boolean(await getReservation(e.id, slot.id));
  if (taken || !(await reserve(e.id, r))) {
    return NextResponse.json({ error: msg("Ktoś właśnie zarezerwował ten termin. Wybierz inny.", "Someone has just booked this time. Please choose another."), code: "TAKEN" }, { status: 409 });
  }
  const brand = await getUserBrand(e.uid).catch(() => null);
  await mailBooked(e, slot, r, brand?.studioName ?? null, brand?.email ?? null);
  return NextResponse.json({ ok: true });
}
