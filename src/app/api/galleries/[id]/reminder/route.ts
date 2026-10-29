import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { isValidGalleryId } from "@/lib/r2";
import { getMeta, saveMeta, hasAccess, accessCookieName, isExpired } from "@/lib/galleries";
import { REMINDER_DAYS } from "@/lib/client-extend";

export const runtime = "nodejs";

// Klient zapisuje się na przypomnienie mailowe o końcu dostępu do galerii
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { email?: string; days?: number };
  const en = req.headers.get("accept-language")?.startsWith("en");
  const err = (pl: string, eng: string, status = 400) => NextResponse.json({ error: en ? eng : pl }, { status });
  if (!isValidGalleryId(id)) return err("Nie znaleziono galerii.", "Gallery not found.", 404);
  const meta = await getMeta(id).catch(() => null);
  if (!meta?.plan || meta.plan === "pro" || !meta.expiresAt || isExpired(meta)) return err("Tej galerii nie można ustawić przypomnienia.", "Reminders aren't available for this gallery.");
  const store = await cookies();
  if (!hasAccess(id, meta, store.get(accessCookieName(id))?.value)) return err("Otwórz galerię, aby ustawić przypomnienie.", "Open the gallery to set a reminder.", 403);
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) return err("Podaj poprawny adres e-mail.", "Enter a valid e-mail address.");
  const days = Number(body.days);
  if (!(REMINDER_DAYS as readonly number[]).includes(days)) return err("Wybierz, kiedy przypomnieć.", "Choose when to remind you.");
  const list = (meta.reminders ?? []).filter((r) => r.email !== email);
  if (list.length >= 20) return err("Za dużo przypomnień w tej galerii.", "Too many reminders for this gallery.");
  list.push({ email, days, token: randomBytes(12).toString("hex") });
  meta.reminders = list;
  await saveMeta(id, meta);
  return NextResponse.json({ ok: true });
}

// Wypisanie z przypomnień (link w mailu)
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = new URL(req.url).searchParams.get("off") ?? "";
  const meta = isValidGalleryId(id) ? await getMeta(id).catch(() => null) : null;
  if (meta?.reminders && token) {
    const before = meta.reminders.length;
    meta.reminders = meta.reminders.filter((r) => r.token !== token);
    if (meta.reminders.length !== before) await saveMeta(id, meta);
  }
  const en = meta?.lang === "en";
  return new NextResponse(
    `<!doctype html><meta name="viewport" content="width=device-width"><body style="font-family:Helvetica,Arial,sans-serif;background:#f8f4f1;color:#3b3633;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center;padding:16px"><div><p style="font-family:Georgia,serif;font-size:24px">Lenslie</p><p>${en ? "You won't receive reminders for this gallery anymore." : "Nie będziesz już dostawać przypomnień o tej galerii."}</p></div></body>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}
