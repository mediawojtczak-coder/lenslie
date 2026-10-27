import { createHash, randomBytes } from "crypto";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { r2, BUCKET } from "@/lib/r2";
import type { PlanAction } from "@/lib/plan-actions";
import type { Billing } from "@/lib/billing";

// Przelewy24 (REST API v1). Dane w Vercelu: P24_MERCHANT_ID, P24_POS_ID, P24_CRC, P24_API_KEY, opcjonalnie P24_SANDBOX=1
export function p24Enabled() {
  return Boolean(process.env.P24_MERCHANT_ID && process.env.P24_CRC && process.env.P24_API_KEY);
}

const host = () => (process.env.P24_SANDBOX === "1" ? "https://sandbox.przelewy24.pl" : "https://secure.przelewy24.pl");
const merchantId = () => Number(process.env.P24_MERCHANT_ID);
const posId = () => Number(process.env.P24_POS_ID || process.env.P24_MERCHANT_ID);
const crc = () => String(process.env.P24_CRC);
const auth = () => "Basic " + Buffer.from(`${posId()}:${process.env.P24_API_KEY}`).toString("base64");

// Podpis: SHA-384 z JSON-a (bez escapowania ukośników i polskich znaków – JSON.stringify robi to tak samo jak P24)
const sign = (o: Record<string, unknown>) => createHash("sha384").update(JSON.stringify(o)).digest("hex");

// Zamówienie zapisane w magazynie: payments/<sessionId>.json
export type Order = {
  sessionId: string;
  galleryId: string;
  ownerId: string;
  email: string;
  amount: number; // grosze
  action: PlanAction;
  description: string;
  status: "pending" | "paid" | "error";
  createdAt: string;
  paidAt?: string;
  orderId?: number;
  invoice?: Billing | null; // dane do faktury, gdy klient jej chce
  invoiceIssued?: boolean;
};

const orderKey = (sid: string) => `payments/${sid}.json`;

export async function saveOrder(o: Order) {
  await r2.send(
    new PutObjectCommand({ Bucket: BUCKET, Key: orderKey(o.sessionId), Body: JSON.stringify(o), ContentType: "application/json" }),
  );
}

export async function getOrder(sid: string): Promise<Order | null> {
  if (!/^[a-z0-9-]{10,80}$/i.test(sid)) return null;
  try {
    const res = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: orderKey(sid) }));
    const text = await res.Body?.transformToString();
    return text ? (JSON.parse(text) as Order) : null;
  } catch {
    return null;
  }
}

export function newSessionId() {
  return `lenslie-${Date.now().toString(36)}-${randomBytes(6).toString("hex")}`;
}

// Rejestruje transakcję i zwraca adres strony płatności
export async function registerTransaction(o: Order, origin: string): Promise<string> {
  const body = {
    merchantId: merchantId(),
    posId: posId(),
    sessionId: o.sessionId,
    amount: o.amount,
    currency: "PLN",
    description: o.description,
    email: o.email,
    country: "PL",
    language: "pl",
    urlReturn: `${origin}/panel/galeria/${o.galleryId}?platnosc=${o.sessionId}`,
    urlStatus: `${origin}/api/platnosci/p24`,
    sign: sign({ sessionId: o.sessionId, merchantId: merchantId(), amount: o.amount, currency: "PLN", crc: crc() }),
  };
  const res = await fetch(`${host()}/api/v1/transaction/register`, {
    method: "POST",
    headers: { Authorization: auth(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.data?.token) {
    console.error("P24 register:", res.status, JSON.stringify(data));
    throw new Error("Bramka płatności nie przyjęła zamówienia. Spróbuj za chwilę.");
  }
  return `${host()}/trnRequest/${data.data.token}`;
}

export type Notification = {
  merchantId: number;
  posId: number;
  sessionId: string;
  amount: number;
  originAmount: number;
  currency: string;
  orderId: number;
  methodId: number;
  statement: string;
  sign: string;
};

export function notificationValid(n: Notification) {
  const expected = sign({
    merchantId: n.merchantId,
    posId: n.posId,
    sessionId: n.sessionId,
    amount: n.amount,
    originAmount: n.originAmount,
    currency: n.currency,
    orderId: n.orderId,
    methodId: n.methodId,
    statement: n.statement,
    crc: crc(),
  });
  return expected === n.sign && n.merchantId === merchantId();
}

// Potwierdza transakcję w P24 – dopiero wtedy pieniądze są zaksięgowane
export async function verifyTransaction(n: Notification) {
  const res = await fetch(`${host()}/api/v1/transaction/verify`, {
    method: "PUT",
    headers: { Authorization: auth(), "Content-Type": "application/json" },
    body: JSON.stringify({
      merchantId: merchantId(),
      posId: posId(),
      sessionId: n.sessionId,
      amount: n.amount,
      currency: n.currency,
      orderId: n.orderId,
      sign: sign({ sessionId: n.sessionId, orderId: n.orderId, amount: n.amount, currency: n.currency, crc: crc() }),
    }),
  });
  if (!res.ok) console.error("P24 verify:", res.status, await res.text().catch(() => ""));
  return res.ok;
}

// Ostatnie płatności (do panelu administratora)
export async function listOrders(limit = 100): Promise<Order[]> {
  const { listObjects } = await import("@/lib/photos");
  const objs = (await listObjects("payments/")).sort((a, b) => b.modified.localeCompare(a.modified)).slice(0, limit);
  const out = await Promise.all(objs.map((o) => getOrder(o.key.slice("payments/".length).replace(/\.json$/, ""))));
  return out.filter((o): o is Order => Boolean(o));
}
