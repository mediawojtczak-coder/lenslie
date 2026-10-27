import { NextResponse } from "next/server";
import { isValidGalleryId } from "@/lib/r2";
import { getMeta, saveMeta } from "@/lib/galleries";
import { getGalleryUsage } from "@/lib/photos";
import { getUser } from "@/lib/supabase/server";
import { PLANS, getPlan, isPeriod, addMonths, upgradeCost, planBytes } from "@/lib/plans";

export const runtime = "nodejs";

// Zmiana pakietu na większy albo przedłużenie dostępu.
// TRYB TESTOWY: na razie bez płatności – zwracamy kwotę, którą później pobierze bramka płatności.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Zaloguj się ponownie." }, { status: 401 });
  if (!isValidGalleryId(id)) return NextResponse.json({ error: "Nieprawidłowa galeria." }, { status: 400 });

  const { data: own } = await supabase.from("galleries").select("id").eq("id", id).maybeSingle();
  if (!own) return NextResponse.json({ error: "To nie jest Twoja galeria." }, { status: 403 });

  const body = (await req.json().catch(() => null)) as
    | { action?: string; plan?: string; period?: number }
    | null;
  const meta = await getMeta(id);
  if (!meta) return NextResponse.json({ error: "Nie znaleziono galerii." }, { status: 404 });

  // Galeria bez pakietu (utworzona przed wprowadzeniem cennika): pierwszy wybór pakietu
  if (body?.action === "choose") {
    const plan = getPlan(body.plan);
    if (!plan || !isPeriod(body.period)) {
      return NextResponse.json({ error: "Wybierz pakiet i okres." }, { status: 400 });
    }
    if (meta.plan) return NextResponse.json({ error: "Ta galeria ma już pakiet." }, { status: 400 });
    const used = await getGalleryUsage(id);
    if (used > planBytes(plan) * 1.02) {
      return NextResponse.json({ error: "Zdjęcia w galerii nie mieszczą się w tym pakiecie." }, { status: 400 });
    }
    meta.plan = plan.id;
    meta.period = body.period;
    meta.expiresAt = addMonths(new Date(), body.period).toISOString();
    await saveMeta(id, meta);
    return NextResponse.json({ ok: true, charged: plan.prices[body.period] });
  }

  const current = getPlan(meta.plan);
  if (!current || !meta.period) {
    return NextResponse.json({ error: "Galeria nie ma jeszcze pakietu." }, { status: 400 });
  }

  if (body?.action === "upgrade") {
    const next = getPlan(body.plan);
    const order = PLANS.map((p) => p.id);
    if (!next || order.indexOf(next.id) <= order.indexOf(current.id)) {
      return NextResponse.json({ error: "Pakiet można zmienić tylko na większy." }, { status: 400 });
    }
    const charged = upgradeCost(current, next, meta.period);
    meta.plan = next.id;
    await saveMeta(id, meta);
    return NextResponse.json({ ok: true, charged });
  }

  if (body?.action === "extend") {
    if (!isPeriod(body.period)) return NextResponse.json({ error: "Wybierz okres." }, { status: 400 });
    const base = meta.expiresAt && new Date(meta.expiresAt) > new Date() ? new Date(meta.expiresAt) : new Date();
    meta.expiresAt = addMonths(base, body.period).toISOString();
    await saveMeta(id, meta);
    return NextResponse.json({ ok: true, charged: current.prices[body.period] });
  }

  return NextResponse.json({ error: "Nieznana operacja." }, { status: 400 });
}
