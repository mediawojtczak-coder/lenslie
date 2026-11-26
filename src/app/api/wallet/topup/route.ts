import { NextResponse } from "next/server";
import { E } from "@/lib/api-lang";
import { getUser } from "@/lib/supabase/server";
import { TOPUPS, TOPUPS_FOREIGN } from "@/lib/wallet";
import { stripeCurrency } from "@/lib/stripe";
import { startPayment } from "@/lib/checkout";
import { toPln } from "@/lib/foreign-prices";
import { cleanBilling, saveBilling } from "@/lib/billing";
import { p24Enabled, newSessionId, saveOrder, registerTransaction } from "@/lib/p24";

export const runtime = "nodejs";

// Doładowanie salda przez Przelewy24
export async function POST(req: Request) {
  const { user } = await getUser();
  if (!user) return NextResponse.json({ error: await E("Zaloguj się ponownie.") }, { status: 401 });
  if (!p24Enabled()) return NextResponse.json({ error: await E("Płatności nie są jeszcze włączone.") }, { status: 503 });

  const body = ((await req.json().catch(() => null)) ?? {}) as { amount?: number; invoice?: unknown };
  // wersja angielska z kartą: doładowanie w walucie fotografa przez Stripe
  const cur = await stripeCurrency(user.email).catch(() => null);
  if (cur) {
    const fp = TOPUPS_FOREIGN.find((t) => t.amount === Number(body.amount));
    if (!fp) return NextResponse.json({ error: "Choose a top-up amount." }, { status: 400 });
    const inv0 = cleanBilling(body.invoice);
    if (!inv0.ok) return NextResponse.json({ error: await E(inv0.error) }, { status: 400 });
    if (body.invoice) await saveBilling(user.id, inv0.billing).catch(() => undefined);
    const order = {
      sessionId: newSessionId(),
      galleryId: "",
      ownerId: user.id,
      email: user.email ?? "",
      amount: Math.round(toPln(fp.amount, cur) * 100),
      action: { action: "topup" as const, amount: fp.amount, bonus: fp.bonus, cur },
      returnPath: "/panel/konto?tab=saldo",
      description: `Lenslie - balance top-up ${fp.amount} ${cur.toUpperCase()}${fp.bonus ? ` (+${fp.bonus} bonus)` : ""}`,
      status: "pending" as const,
      invoice: inv0.billing.want ? inv0.billing : null,
      createdAt: new Date().toISOString(),
    };
    await saveOrder(order);
    try {
      return NextResponse.json({ ok: true, redirect: await startPayment(order, new URL(req.url).origin) });
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Payment error." }, { status: 502 });
    }
  }
  const pack = TOPUPS.find((t) => t.amount === Number(body.amount));
  if (!pack) return NextResponse.json({ error: await E("Wybierz kwotę doładowania.") }, { status: 400 });

  const inv = cleanBilling(body.invoice);
  if (!inv.ok) return NextResponse.json({ error: await E(inv.error) }, { status: 400 });
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
    return NextResponse.json({ error: await E(err instanceof Error ? err.message : "Błąd płatności.") }, { status: 502 });
  }
}
