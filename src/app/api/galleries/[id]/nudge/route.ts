import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { E } from "@/lib/api-lang";
import { requireOwner } from "@/lib/owner";
import { getUser } from "@/lib/supabase/server";
import { getMeta, saveMeta, isExpired } from "@/lib/galleries";
import { getUserBrand } from "@/lib/profiles";
import { getDomainByUser, domainActive } from "@/lib/domains";
import { sendEmail } from "@/lib/email";
import { coupleReminderMail } from "@/lib/couple-mail";

export const runtime = "nodejs";

const MIN_GAP_MS = 10 * 60 * 1000; // nie częściej niż co 10 minut (ochrona przed przypadkowym podwójnym wysłaniem)

// Fotograf wysyła parze młodej przypomnienie o galerii (link, hasło, data końca dostępu).
// Adres zapamiętujemy przy galerii; para dostanie też automatyczne przypomnienie 7 dni przed końcem dostępu.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const denied = await requireOwner(id);
  if (denied) return denied;
  const { supabase, user } = await getUser();
  const body = (await req.json().catch(() => ({}))) as { email?: string };
  const emails = String(body.email ?? "")
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 2);
  if (!emails.length || emails.some((e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) || e.length > 120)) {
    return NextResponse.json({ error: await E("Podaj poprawny adres e-mail.") }, { status: 400 });
  }
  const meta = await getMeta(id).catch(() => null);
  if (!meta?.plan) return NextResponse.json({ error: await E("Najpierw opublikuj galerię.") }, { status: 400 });
  if (isExpired(meta)) return NextResponse.json({ error: await E("Dostęp do tej galerii już się skończył.") }, { status: 400 });
  if (meta.nudgedAt && Date.now() - new Date(meta.nudgedAt).getTime() < MIN_GAP_MS) {
    return NextResponse.json({ error: await E("Przypomnienie zostało wysłane przed chwilą. Spróbuj ponownie za kilka minut.") }, { status: 429 });
  }

  const [{ data: row }, brand, dom] = await Promise.all([
    supabase.from("galleries").select("title").eq("id", id).maybeSingle(),
    getUserBrand(user!.id).catch(() => ({ studioName: null, logoUrl: null, email: user?.email ?? null })),
    getDomainByUser(user!.id).catch(() => null),
  ]);
  const title = (row as { title?: string } | null)?.title ?? "Galeria";
  const host = domainActive(dom) && dom!.verified ? dom!.host : null;
  const link = host ? `https://${host}/${id}` : `https://www.lenslie.com/galeria/${id}`;
  const en = meta.lang === "en";
  const until = meta.expiresAt
    ? new Intl.DateTimeFormat(en ? "en-GB" : "pl-PL", { day: "numeric", month: "long", year: "numeric" }).format(new Date(meta.expiresAt))
    : null;

  // okładka galerii (ten sam adres co miniatura w podglądzie linku)
  const coverUrl = `https://www.lenslie.com/galeria/${id}/okladka.jpg?v=${encodeURIComponent(meta.coverFile ?? meta.cover ?? "1")}`;
  const { subject, html } = coupleReminderMail({ studio: brand.studioName, title, coverUrl, link, password: meta.password, until, en });

  let sent = 0;
  for (const to of emails) {
    if (await sendEmail({ to, subject, html, replyTo: brand.email ?? undefined }).catch(() => false)) sent++;
  }
  if (!sent) return NextResponse.json({ error: await E("Nie udało się wysłać maila. Spróbuj ponownie.") }, { status: 502 });

  // zapamiętujemy adres i dopisujemy automatyczne przypomnienie przed końcem dostępu (jak przy zapisie przez klienta)
  meta.clientEmail = emails.join(", ");
  meta.nudgedAt = new Date().toISOString();
  if (meta.plan !== "pro" && meta.expiresAt) {
    const list = meta.reminders ?? [];
    for (const email of emails) if (!list.some((r) => r.email === email)) list.push({ email, days: 7, token: randomBytes(12).toString("hex") });
    meta.reminders = list.slice(-20);
  }
  await saveMeta(id, meta);
  return NextResponse.json({ ok: true, sentAt: meta.nudgedAt, email: meta.clientEmail });
}
