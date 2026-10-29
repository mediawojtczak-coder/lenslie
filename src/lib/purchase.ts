import { NextResponse } from "next/server";
import { E } from "@/lib/api-lang";
import { cleanBilling, saveBilling } from "@/lib/billing";
import { spend, getWallet, zlFromGr } from "@/lib/wallet";
import { notifyAdmins } from "@/lib/email";
import { p24Enabled, newSessionId, saveOrder, registerTransaction, type ProductAction } from "@/lib/p24";
import { fulfillProduct } from "@/lib/products";

// Wspólna płatność za dodatki (motywy, strona portfolio, wyszukiwanie twarzy):
// z salda, przez Przelewy24 albo – bez skonfigurowanej bramki – od razu (tryb testowy).
export async function purchase(opts: {
  req: Request;
  user: { id: string; email?: string | null };
  amount: number; // zł
  label: string;
  pay: unknown;
  invoice: unknown;
  action: ProductAction;
  returnPath: string;
  galleryId?: string;
}) {
  const { req, user, amount, label, action } = opts;
  const inv = cleanBilling(opts.invoice);
  if (!inv.ok) return NextResponse.json({ error: await E(inv.error) }, { status: 400 });
  if (opts.invoice) await saveBilling(user.id, inv.billing).catch(() => undefined);
  const gr = Math.round(amount * 100);

  // Bez opłaty (np. w abonamencie Pro)
  if (gr <= 0) {
    await fulfillProduct(action);
    return NextResponse.json({ ok: true, free: true });
  }

  if (opts.pay === "wallet") {
    const ok = await spend(user.id, gr, label, `${action.product}-${Date.now()}`);
    if (!ok) return NextResponse.json({ error: await E("Za mało środków na koncie. Doładuj konto albo zapłać BLIK-iem.") }, { status: 402 });
    await fulfillProduct(action);
    const left = (await getWallet(user.id)).balance;
    await notifyAdmins(`Zakup z salda: ${zlFromGr(gr)} – ${user.email}`, "Nowy zakup z salda", [
      `Kwota: ${zlFromGr(gr)} (z salda konta).`,
      `Za: ${label}.`,
      `Konto: ${user.email}. Pozostało na saldzie: ${zlFromGr(left)}.`,
    ]);
    return NextResponse.json({ ok: true });
  }
  if (!p24Enabled() || gr <= 0) {
    await fulfillProduct(action);
    return NextResponse.json({ ok: true, test: true });
  }
  const order = {
    sessionId: newSessionId(),
    galleryId: opts.galleryId ?? "",
    ownerId: user.id,
    email: user.email ?? "",
    amount: gr,
    action,
    returnPath: opts.returnPath,
    description: `Lenslie - ${label}`.replace(/[–—]/g, "-").slice(0, 1024),
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
