import { randomBytes } from "crypto";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { r2, BUCKET } from "@/lib/r2";
import { listObjects } from "@/lib/photos";

// Rezerwacje sesji: fotograf tworzy kalendarz (np. „Mini sesje świąteczne”) z terminami,
// klient wybiera wolny termin na publicznej stronie /rezerwacja/<id>.
// Każda rezerwacja to osobny plik zakładany warunkowo (If-None-Match), więc dwie osoby nie zajmą tego samego terminu.

export type Slot = { id: string; date: string; time: string };
export type BookingEvent = {
  id: string;
  uid: string;
  title: string;
  description: string;
  location: string;
  price: string;
  duration: number;
  lang: "pl" | "en";
  open: boolean;
  slots: Slot[];
  createdAt: string;
};
export type Reservation = {
  slot: string;
  name: string;
  email: string;
  phone: string;
  note: string;
  at: string;
  token: string;
};

const eventKey = (id: string) => `bookings/events/${id}.json`;
const resPrefix = (id: string) => `bookings/reservations/${id}/`;
const resKey = (id: string, slot: string) => `${resPrefix(id)}${slot}.json`;
const userKey = (uid: string) => `bookings/users/${uid}.json`;

async function getJson<T>(key: string): Promise<T | null> {
  try {
    const res = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    const text = await res.Body?.transformToString();
    return text ? (JSON.parse(text) as T) : null;
  } catch {
    return null;
  }
}
const putJson = (key: string, v: unknown) =>
  r2.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: JSON.stringify(v), ContentType: "application/json" }));

export const isEventId = (id: string) => /^[a-z0-9-]{3,80}$/.test(id);
export const slotId = (date: string, time: string) => `${date}_${time.replace(":", "-")}`;
export const isDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(new Date(`${d}T00:00:00Z`).getTime());
export const isTime = (t: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);

export function toSlug(text: string) {
  return text
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export async function getEvent(id: string) {
  return isEventId(id) ? getJson<BookingEvent>(eventKey(id)) : null;
}
export async function saveEvent(e: BookingEvent) {
  e.slots.sort((a, b) => a.id.localeCompare(b.id));
  await putJson(eventKey(e.id), e);
}

export async function listUserEvents(uid: string): Promise<BookingEvent[]> {
  const ids = (await getJson<{ events: string[] }>(userKey(uid)))?.events ?? [];
  const list = await Promise.all(ids.map((id) => getEvent(id)));
  return list.filter((e): e is BookingEvent => Boolean(e && e.uid === uid));
}

export async function createEvent(uid: string, title: string, lang: "pl" | "en"): Promise<BookingEvent> {
  const id = `${toSlug(title) || "sesje"}-${randomBytes(2).toString("hex")}`;
  const e: BookingEvent = {
    id,
    uid,
    title,
    description: "",
    location: "",
    price: "",
    duration: 20,
    lang,
    open: true,
    slots: [],
    createdAt: new Date().toISOString(),
  };
  await saveEvent(e);
  const idx = (await getJson<{ events: string[] }>(userKey(uid)))?.events ?? [];
  await putJson(userKey(uid), { events: [id, ...idx.filter((x) => x !== id)] });
  return e;
}

export async function deleteEvent(e: BookingEvent) {
  for (const o of await listObjects(resPrefix(e.id)).catch(() => [])) {
    await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: o.key }));
  }
  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: eventKey(e.id) }));
  const idx = (await getJson<{ events: string[] }>(userKey(e.uid)))?.events ?? [];
  await putJson(userKey(e.uid), { events: idx.filter((x) => x !== e.id) });
}

export async function listReservations(id: string): Promise<Map<string, Reservation>> {
  const objs = await listObjects(resPrefix(id)).catch(() => []);
  const list = await Promise.all(objs.map((o) => getJson<Reservation>(o.key)));
  return new Map(list.filter((r): r is Reservation => Boolean(r)).map((r) => [r.slot, r]));
}

export const getReservation = (id: string, slot: string) => getJson<Reservation>(resKey(id, slot));

// Zajęcie terminu: zapis tylko wtedy, gdy plik jeszcze nie istnieje. false = termin już zajęty.
export async function reserve(id: string, r: Reservation): Promise<boolean> {
  try {
    await r2.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: resKey(id, r.slot),
        Body: JSON.stringify(r),
        ContentType: "application/json",
        IfNoneMatch: "*",
      }),
    );
    return true;
  } catch (err) {
    const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (e.$metadata?.httpStatusCode === 412 || e.name === "PreconditionFailed") return false;
    throw err;
  }
}

export const cancelReservation = (id: string, slot: string) =>
  r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: resKey(id, slot) }));

export const newToken = () => randomBytes(16).toString("hex");

// Termin już minął (czas polski)
export function slotPast(s: Slot) {
  const nowPl = new Date().toLocaleString("sv-SE", { timeZone: "Europe/Warsaw" }).slice(0, 16).replace(" ", "T");
  return `${s.date}T${s.time}` <= nowPl;
}

// Generator terminów: od–do co N minut
export function generateSlots(date: string, from: string, to: string, every: number): Slot[] {
  if (!isDate(date) || !isTime(from) || !isTime(to) || !(every >= 5 && every <= 480)) return [];
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
  const out: Slot[] = [];
  for (let m = toMin(from); m < toMin(to) && out.length < 100; m += every) {
    const time = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    out.push({ id: slotId(date, time), date, time });
  }
  return out;
}

// Plik .ics do dodania terminu do kalendarza
export function icsFor(e: BookingEvent, s: Slot, studio: string | null) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const start = `${s.date.replace(/-/g, "")}T${s.time.replace(":", "")}00`;
  const [y, mo, d] = s.date.split("-").map(Number);
  const [h, mi] = s.time.split(":").map(Number);
  const endDate = new Date(Date.UTC(y, mo - 1, d, h, mi + e.duration));
  const end = `${endDate.getUTCFullYear()}${pad(endDate.getUTCMonth() + 1)}${pad(endDate.getUTCDate())}T${pad(endDate.getUTCHours())}${pad(endDate.getUTCMinutes())}00`;
  const esc = (t: string) => t.replace(/\\/g, "\\\\").replace(/[,;]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Lenslie//Rezerwacje//PL",
    "BEGIN:VEVENT",
    `UID:${e.id}-${s.id}@lenslie.com`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    `DTSTART;TZID=Europe/Warsaw:${start}`,
    `DTEND;TZID=Europe/Warsaw:${end}`,
    `SUMMARY:${esc(studio ? `${e.title} – ${studio}` : e.title)}`,
    ...(e.location ? [`LOCATION:${esc(e.location)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
