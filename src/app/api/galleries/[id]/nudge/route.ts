import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { E } from "@/lib/api-lang";
import { requireOwner } from "@/lib/owner";
import { getMeta, saveMeta } from "@/lib/galleries";
import { COUPLE_REMIND_DAYS } from "@/lib/couple-mail";

export const runtime = "nodejs";

// Fotograf wpisuje e-mail pary młodej na kafelku galerii (zapis automatyczny).
// Para dostanie elegancki mail z przypomnieniem 7 dni przed końcem dostępu (wysyła codzienny cron).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const denied = await requireOwner(id);
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as { email?: string };
  const emails = String(body.email ?? "")
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 2);
  if (emails.some((e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) || e.length > 120)) {
    return NextResponse.json({ error: await E("Podaj poprawny adres e-mail.") }, { status: 400 });
  }
  const meta = await getMeta(id).catch(() => null);
  if (!meta) return NextResponse.json({ error: await E("Nieprawidłowe dane.") }, { status: 400 });

  meta.clientEmail = emails.length ? emails.join(", ") : undefined;
  // przypomnienia ustawione przez fotografa zastępujemy nowymi; te od klienta (z galerii) zostają
  const fromClient = (meta.reminders ?? []).filter((r) => r.by !== "photographer");
  const old = new Map((meta.reminders ?? []).filter((r) => r.by === "photographer").map((r) => [r.email, r]));
  const mine = meta.plan === "pro" ? [] : emails.map((email) => old.get(email) ?? { email, days: COUPLE_REMIND_DAYS, token: randomBytes(12).toString("hex"), by: "photographer" as const });
  meta.reminders = [...fromClient.filter((r) => !emails.includes(r.email)), ...mine].slice(-20);
  await saveMeta(id, meta);
  return NextResponse.json({ ok: true, email: meta.clientEmail ?? "" });
}
