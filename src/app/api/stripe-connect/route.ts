import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { stripeAllowed } from "@/lib/stripe";
import { startConnect, refreshConnect, connectDashboard, CONNECT_COUNTRIES } from "@/lib/stripe-connect";
import { siteUrl } from "@/lib/email";

export const runtime = "nodejs";

// Podłączenie konta Stripe fotografa (płatności kartą za zdjęcia w galeriach angielskich)
export async function POST(req: Request) {
  const { user } = await getUser();
  if (!user) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  if (!stripeAllowed(user.email)) return NextResponse.json({ error: "Card payments are not available yet." }, { status: 403 });
  const body = ((await req.json().catch(() => null)) ?? {}) as { action?: string; country?: string };
  const origin = new URL(req.url).origin;
  try {
    if (body.action === "dashboard") {
      const url = await connectDashboard(user.id);
      return url ? NextResponse.json({ ok: true, redirect: url }) : NextResponse.json({ error: "Stripe account not found." }, { status: 404 });
    }
    const country = String(body.country ?? "").toUpperCase();
    if (!CONNECT_COUNTRIES.some(([c]) => c === country)) return NextResponse.json({ error: "Choose your country." }, { status: 400 });
    return NextResponse.json({ ok: true, redirect: await startConnect(user.id, user.email ?? "", country, origin) });
  } catch (e) {
    console.error("Stripe Connect:", e);
    return NextResponse.json({ error: "Stripe could not start the setup. Please try again in a moment." }, { status: 502 });
  }
}

// Powrót z Stripe (koniec albo przerwanie zakładania konta)
export async function GET(req: Request) {
  const { user } = await getUser();
  const url = new URL(req.url);
  if (!user) return NextResponse.redirect(`${siteUrl()}/logowanie`);
  if (url.searchParams.get("again") && stripeAllowed(user.email)) {
    // link wygasł – tworzymy nowy i wracamy do Stripe
    const c = await refreshConnect(user.id);
    if (c) {
      const next = await startConnect(user.id, user.email ?? "", c.country, url.origin).catch(() => null);
      if (next) return NextResponse.redirect(next);
    }
  }
  await refreshConnect(user.id).catch(() => null);
  return NextResponse.redirect(`${url.origin}/panel/konto?tab=wplaty`);
}
