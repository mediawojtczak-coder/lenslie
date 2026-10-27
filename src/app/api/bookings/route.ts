import { NextResponse } from "next/server";
import { E } from "@/lib/api-lang";
import { getUser } from "@/lib/supabase/server";
import { getLang } from "@/lib/lang-server";
import { getUserBrand } from "@/lib/profiles";
import {
  createEvent,
  getEvent,
  saveEvent,
  deleteEvent,
  generateSlots,
  isDate,
  isTime,
  slotId,
  getReservation,
  cancelReservation,
} from "@/lib/bookings";
import { mailCancelledByOwner } from "@/lib/bookings-mail";

export const runtime = "nodejs";

type Body = Record<string, unknown> & { action?: string; id?: string };

// Kalendarze rezerwacji fotografa: tworzenie, ustawienia, terminy, odwoływanie
export async function POST(req: Request) {
  const { user } = await getUser();
  if (!user) return NextResponse.json({ error: await E("Zaloguj się ponownie.") }, { status: 401 });
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body) return NextResponse.json({ error: await E("Nieprawidłowe dane.") }, { status: 400 });

  if (body.action === "create") {
    const title = String(body.title ?? "").trim().slice(0, 100);
    if (!title) return NextResponse.json({ error: await E("Wpisz nazwę.") }, { status: 400 });
    const e = await createEvent(user.id, title, await getLang());
    return NextResponse.json({ ok: true, id: e.id });
  }

  const e = await getEvent(String(body.id ?? ""));
  if (!e || e.uid !== user.id) return NextResponse.json({ error: await E("Nie znaleziono kalendarza.") }, { status: 404 });

  switch (body.action) {
    case "save": {
      const title = String(body.title ?? "").trim().slice(0, 100);
      if (!title) return NextResponse.json({ error: await E("Wpisz nazwę.") }, { status: 400 });
      const duration = Math.floor(Number(body.duration) || 0);
      if (duration < 5 || duration > 600) return NextResponse.json({ error: await E("Czas sesji: od 5 do 600 minut.") }, { status: 400 });
      e.title = title;
      e.description = String(body.description ?? "").trim().slice(0, 2000);
      e.location = String(body.location ?? "").trim().slice(0, 200);
      e.price = String(body.price ?? "").trim().slice(0, 100);
      e.duration = duration;
      e.lang = body.lang === "en" ? "en" : "pl";
      e.open = Boolean(body.open);
      await saveEvent(e);
      return NextResponse.json({ ok: true });
    }
    case "add-slots": {
      const date = String(body.date ?? "");
      const from = String(body.from ?? "");
      const to = String(body.to ?? "");
      const every = Math.floor(Number(body.every) || 0);
      let slots = generateSlots(date, from, to, every);
      if (!to && isDate(date) && isTime(from)) slots = [{ id: slotId(date, from), date, time: from }];
      if (slots.length === 0) return NextResponse.json({ error: await E("Sprawdź datę i godziny.") }, { status: 400 });
      const have = new Set(e.slots.map((s) => s.id));
      const added = slots.filter((s) => !have.has(s.id));
      if (e.slots.length + added.length > 500) return NextResponse.json({ error: await E("Kalendarz może mieć najwyżej 500 terminów.") }, { status: 400 });
      e.slots.push(...added);
      await saveEvent(e);
      return NextResponse.json({ ok: true, added: added.length });
    }
    case "remove-slot": {
      const slot = String(body.slot ?? "");
      if (await getReservation(e.id, slot)) return NextResponse.json({ error: await E("Ten termin jest zarezerwowany – najpierw go odwołaj.") }, { status: 409 });
      e.slots = e.slots.filter((s) => s.id !== slot);
      await saveEvent(e);
      return NextResponse.json({ ok: true });
    }
    case "cancel": {
      const slot = e.slots.find((s) => s.id === String(body.slot ?? ""));
      const r = slot ? await getReservation(e.id, slot.id) : null;
      if (!slot || !r) return NextResponse.json({ error: await E("Nie znaleziono rezerwacji.") }, { status: 404 });
      await cancelReservation(e.id, slot.id);
      const brand = await getUserBrand(user.id).catch(() => null);
      await mailCancelledByOwner(e, slot, r, brand?.studioName ?? null);
      return NextResponse.json({ ok: true });
    }
    case "delete": {
      await deleteEvent(e);
      return NextResponse.json({ ok: true });
    }
  }
  return NextResponse.json({ error: await E("Nieznana operacja.") }, { status: 400 });
}
