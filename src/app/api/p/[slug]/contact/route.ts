import { NextResponse } from "next/server";
import { getSiteBySlug, portfolioActive } from "@/lib/portfolio";
import { getUserBrand } from "@/lib/profiles";
import { sendEmail, emailLayout } from "@/lib/email";
import { getUserLang } from "@/lib/lang-server";

export const runtime = "nodejs";

const recent = new Map<string, number>();

// Formularz kontaktowy ze strony portfolio – wiadomość trafia na e-mail fotografa
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = await getSiteBySlug(slug);
  const en = site?.lang === "en";
  const msg = (pl: string, e: string) => (en ? e : pl);
  if (!site || !portfolioActive(site)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const b = (await req.json().catch(() => null)) as Record<string, string> | null;
  if (!b || b.website) return NextResponse.json({ ok: true }); // pole-pułapka na boty
  const name = String(b.name ?? "").trim().slice(0, 80);
  const email = String(b.email ?? "").trim().slice(0, 120);
  const phone = String(b.phone ?? "").trim().slice(0, 30);
  const date = String(b.date ?? "").trim().slice(0, 40);
  const text = String(b.message ?? "").trim().slice(0, 3000);
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !text) {
    return NextResponse.json({ error: msg("Uzupełnij imię, e-mail i wiadomość.", "Please fill in your name, email and message.") }, { status: 400 });
  }
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0];
  const last = recent.get(ip) ?? 0;
  if (Date.now() - last < 30_000) return NextResponse.json({ error: msg("Poczekaj chwilę przed kolejną wiadomością.", "Please wait a moment before sending another message.") }, { status: 429 });
  recent.set(ip, Date.now());

  const brand = await getUserBrand(site.uid).catch(() => null);
  if (!brand?.email) return NextResponse.json({ error: "No recipient" }, { status: 500 });
  const ol = await getUserLang(site.uid);
  const oen = ol === "en";
  const ok = await sendEmail({
    to: brand.email,
    replyTo: email,
    subject: oen ? `New enquiry from your website: ${name}` : `Nowe zapytanie ze strony: ${name}`,
    html: emailLayout(
      oen ? "New enquiry" : "Nowe zapytanie",
      [
        `${name} · ${email}${phone ? ` · ${phone}` : ""}`,
        ...(date ? [`${oen ? "Date" : "Termin"}: ${date}`] : []),
        text,
        oen ? "Reply to this email to answer the client directly." : "Odpowiedz na tego maila, a odpowiedź trafi prosto do klienta.",
      ],
      undefined,
      ol,
    ),
  });
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: msg("Nie udało się wysłać. Spróbuj ponownie.", "Could not send. Please try again.") }, { status: 502 });
}
