import { randomBytes } from "crypto";
import { GetObjectCommand, ListObjectsV2Command, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, BUCKET } from "@/lib/r2";

// Zamawianie wydrukowanych albumów przez fotografów (cennik w print-prices.ts)
export * from "@/lib/print-prices";

export type Shipping = { name: string; phone: string; email: string; locker: string };

export type PrintOrder = {
  id: string;
  uid: string;
  email: string; // konto fotografa
  galleryId: string;
  title: string;
  format: string;
  pages: number; // strony do druku
  spreads: number; // rozkładówki w projekcie
  copies: number;
  price: number; // zł brutto razem z wysyłką
  shipping: Shipping;
  status: "draft" | "paid" | "ordered" | "sent";
  zip?: boolean; // pliki wgrane
  tracking?: string;
  createdAt: string;
  paidAt?: string;
};

const orderKey = (id: string) => `print-orders/${id}.json`;
export const zipKey = (id: string) => `print-orders/${id}/album.zip`;

export const newPrintId = () => `alb-${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`;
export const isPrintId = (id: string) => /^alb-[a-z0-9]+-[a-f0-9]{8}$/.test(id);

export async function getPrintOrder(id: string): Promise<PrintOrder | null> {
  if (!isPrintId(id)) return null;
  try {
    const res = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: orderKey(id) }));
    const text = await res.Body?.transformToString();
    return text ? (JSON.parse(text) as PrintOrder) : null;
  } catch {
    return null;
  }
}

export async function savePrintOrder(o: PrintOrder) {
  await r2.send(new PutObjectCommand({ Bucket: BUCKET, Key: orderKey(o.id), Body: JSON.stringify(o), ContentType: "application/json" }));
}

export async function listPrintOrders(limit = 200): Promise<PrintOrder[]> {
  const res = await r2.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: "print-orders/", MaxKeys: 1000 }));
  const keys = (res.Contents ?? []).map((o) => o.Key!).filter((k) => /^print-orders\/[^/]+\.json$/.test(k));
  const all = await Promise.all(keys.map((k) => getPrintOrder(k.slice("print-orders/".length, -5))));
  return all
    .filter((o): o is PrintOrder => Boolean(o) && o!.status !== "draft")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export const zipUploadUrl = (id: string) =>
  getSignedUrl(r2, new PutObjectCommand({ Bucket: BUCKET, Key: zipKey(id), ContentType: "application/zip" }), { expiresIn: 7200 });

export const zipDownloadUrl = (id: string, days = 7) =>
  getSignedUrl(
    r2,
    new GetObjectCommand({ Bucket: BUCKET, Key: zipKey(id), ResponseContentDisposition: `attachment; filename="${id}.zip"` }),
    { expiresIn: Math.min(7, days) * 24 * 3600 },
  );

export function cleanShipping(raw: unknown): { ok: true; s: Shipping } | { ok: false; error: string } {
  const r = (raw ?? {}) as Record<string, unknown>;
  const s: Shipping = {
    name: String(r.name ?? "").trim().slice(0, 100),
    phone: String(r.phone ?? "").replace(/[^\d+]/g, "").slice(0, 16),
    email: String(r.email ?? "").trim().slice(0, 120),
    locker: String(r.locker ?? "").trim().toUpperCase().replace(/\s+/g, "").slice(0, 12),
  };
  if (s.name.length < 3) return { ok: false, error: "Podaj imię i nazwisko odbiorcy." };
  if (!/^(\+48)?\d{9}$/.test(s.phone)) return { ok: false, error: "Podaj numer telefonu (9 cyfr) – InPost wyśle na niego kod odbioru." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email)) return { ok: false, error: "Podaj poprawny adres e-mail odbiorcy." };
  if (!/^[A-Z]{3}\d{2,4}[A-Z]{0,3}$/.test(s.locker)) return { ok: false, error: "Podaj kod paczkomatu, np. KRA01M." };
  return { ok: true, s };
}
