import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { TOPUPS } from "@/lib/wallet";
import { cleanBilling, saveBilling } from "@/lib/billing";
import { p24Enabled, newSessionId, saveOrder, registerTransaction } from "@/lib/p24";

export const runtime = "nodejs";

// Doładowanie salda przez Przelewy24
export async function POST(req: Request) {
  const { user } = await getUser();
  if (!user) return NextResponse.json({ error: "Zaloguj się ponownie." }, { status: 401 });
  if (!p24Enabled()) return NextResponse.json({ error: "Płatności nie są jeszcze włączone." }, { status: 503 });

  const body = ((await req.json().catch(() => null)) ?? {}) as { amount?: number; invoice?: unknown };
  const pack = TOPUPS.find((t) => t.amount === Number(body.amount));
  if (!pack) return NextResponse.json({ error: "Wybierz kwotę doładowania." }, { status: 400 });

  const inv = cleanBilling(body.invoice);
  if (!inv.ok) return NextResponse.json({ error: inv.error }, { status: 400 });
  if (body.invoice) await saveBilling(user.id, inv.billing).catch(() => undefined);

  const order = {
    sessionId: newSessionId(),
    galleryId: "",
    ownerId: user.id,
    email: user.email ?? "",
    amount: pack.amount * 100,
    action: { action: "topup" as const, amount: pack.amount, bonus: pack.bonus },
    returnPath: "/panel/konto",
    description: `Lenslie - doładowanie konta ${pack.amount} zł${pack.bonus ? ` (+${pack.bonus} zł gratis)` : ""}`,
    status: "pending" as const,
    invoice: inv.billing.want ? inv.billing : null,
    createdAt: new Date().toISOString(),
  };
  await saveOrder(order);
  try {
    return NextResponse.json({ ok: true, redirect: await registerTransaction(order, new URL(req.url).origin) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Błąd płatności." }, { status: 502 });
  }
}
