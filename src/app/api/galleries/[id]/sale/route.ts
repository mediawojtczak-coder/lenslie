import { NextResponse } from "next/server";
import { E } from "@/lib/api-lang";
import { getMeta, saveMeta } from "@/lib/galleries";
import { requireOwner } from "@/lib/owner";
import { cleanSale, getSaleOrder, saveSaleOrder, deleteSaleOrder } from "@/lib/sales";
import { mailDelivered } from "@/lib/sales-mail";

export const runtime = "nodejs";

type Body =
  | { action: "save"; sale?: unknown }
  | { action: "limit"; max?: unknown; label?: unknown }
  | { action: "paid" | "deliver" | "reopen"; selection?: string };

// Sprzedaż zdjęć: ustawienia pakietu i obsługa zamówień przez fotografa
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const denied = await requireOwner(id);
  if (denied) return denied;

  const body = (await req.json().catch(() => null)) as Body | null;
  const meta = await getMeta(id);
  if (!body || !meta) return NextResponse.json({ error: await E("Nieprawidłowe dane.") }, { status: 400 });

  if (body.action === "save") {
    const sale = cleanSale(body.sale);
    if (!sale) return NextResponse.json({ error: await E("Sprawdź liczbę zdjęć w pakiecie i cenę.") }, { status: 400 });
    meta.sale = sale;
    await saveMeta(id, meta);
    return NextResponse.json({ ok: true, sale });
  }

  if (body.action === "limit") {
    const max = Math.floor(Number(body.max) || 0);
    if (max < 0 || max > 5000) return NextResponse.json({ error: await E("Sprawdź limit zdjęć.") }, { status: 400 });
    meta.pickLimit = max > 0 ? { max, label: String(body.label ?? "").trim().slice(0, 60) } : undefined;
    await saveMeta(id, meta);
    return NextResponse.json({ ok: true });
  }

  const selection = String(body.selection ?? "");
  const order = selection ? await getSaleOrder(id, selection) : null;
  if (!order) return NextResponse.json({ error: await E("Nie znaleziono zamówienia.") }, { status: 404 });
  const now = new Date().toISOString();

  if (body.action === "paid") {
    order.status = "paid";
    order.paidAt = now;
    await saveSaleOrder(id, order);
    return NextResponse.json({ ok: true, order });
  }

  if (body.action === "deliver") {
    const first = order.status !== "delivered";
    order.status = "delivered";
    order.paidAt = order.paidAt ?? now;
    order.deliveredAt = now;
    await saveSaleOrder(id, order);
    if (first) await mailDelivered(id, meta.title, order, meta.lang ?? "pl");
    return NextResponse.json({ ok: true, order });
  }

  if (body.action === "reopen") {
    await deleteSaleOrder(id, selection);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: await E("Nieznana operacja.") }, { status: 400 });
}
