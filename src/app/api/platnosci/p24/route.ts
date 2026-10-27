import { NextResponse } from "next/server";
import { getOrder, saveOrder, notificationValid, verifyTransaction, type Notification } from "@/lib/p24";
import { applyAction } from "@/lib/plan-actions";

export const runtime = "nodejs";

// Powiadomienie od Przelewy24 o opłaconej transakcji
export async function POST(req: Request) {
  const n = (await req.json().catch(() => null)) as Notification | null;
  if (!n || !notificationValid(n)) {
    console.error("P24: nieprawidłowe powiadomienie");
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const order = await getOrder(n.sessionId);
  if (!order) return NextResponse.json({ error: "unknown" }, { status: 404 });
  if (order.status === "paid") return NextResponse.json({ ok: true });
  if (n.amount !== order.amount || n.currency !== "PLN") {
    console.error("P24: kwota się nie zgadza", n.sessionId, n.amount, order.amount);
    return NextResponse.json({ error: "amount" }, { status: 400 });
  }
  if (!(await verifyTransaction(n))) return NextResponse.json({ error: "verify" }, { status: 502 });

  await applyAction(order.galleryId, order.action);
  await saveOrder({ ...order, status: "paid", paidAt: new Date().toISOString(), orderId: n.orderId });
  return NextResponse.json({ ok: true });
}
