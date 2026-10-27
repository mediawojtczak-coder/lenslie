import { NextResponse } from "next/server";
import { isValidGalleryId } from "@/lib/r2";
import { getMeta } from "@/lib/galleries";
import { getUser } from "@/lib/supabase/server";
import { checkAction, applyAction } from "@/lib/plan-actions";
import { p24Enabled, newSessionId, saveOrder, registerTransaction } from "@/lib/p24";

export const runtime = "nodejs";

// Publikacja, zmiana pakietu i przedłużenie. Z Przelewy24: zwraca adres płatności; bez nich (tryb testowy) wykonuje od razu.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Zaloguj się ponownie." }, { status: 401 });
  if (!isValidGalleryId(id)) return NextResponse.json({ error: "Nieprawidłowa galeria." }, { status: 400 });

  const { data: own } = await supabase.from("galleries").select("id").eq("id", id).maybeSingle();
  if (!own) return NextResponse.json({ error: "To nie jest Twoja galeria." }, { status: 403 });

  const body = ((await req.json().catch(() => null)) ?? {}) as { action?: string; plan?: string; period?: number };
  const meta = await getMeta(id);
  if (!meta) return NextResponse.json({ error: "Nie znaleziono galerii." }, { status: 404 });

  const checked = await checkAction(id, meta, body);
  if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });

  // Nic do zapłaty albo brak bramki (tryb testowy): od razu
  if (checked.amount <= 0 || !p24Enabled()) {
    await applyAction(id, checked.action);
    return NextResponse.json({ ok: true, charged: checked.amount, test: !p24Enabled() });
  }

  const order = {
    sessionId: newSessionId(),
    galleryId: id,
    ownerId: user.id,
    email: user.email ?? "",
    amount: Math.round(checked.amount * 100),
    action: checked.action,
    description: `Lenslie – ${checked.label} – ${meta.title}`.slice(0, 1024),
    status: "pending" as const,
    createdAt: new Date().toISOString(),
  };
  await saveOrder(order);
  try {
    const redirect = await registerTransaction(order, new URL(req.url).origin);
    return NextResponse.json({ ok: true, redirect });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Błąd płatności." }, { status: 502 });
  }
}
