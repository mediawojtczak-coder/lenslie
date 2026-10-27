import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { r2, BUCKET, galleryPrefix } from "@/lib/r2";
import { listObjects } from "@/lib/photos";
import { adminClient } from "@/lib/supabase/admin";
import type { GalleryMeta } from "@/lib/galleries";

// Sprzedaż zdjęć w galerii: klient wybiera zdjęcia do pakietu, za dodatkowe dopłaca fotografowi
// (przelewem albo BLIK-iem na telefon), fotograf potwierdza wpłatę i udostępnia zdjęcia bez znaku wodnego.

export type Sale = { enabled: boolean; included: number; extraPrice: number };
export type OrderStatus = "ordered" | "paid" | "delivered";
export type SaleOrder = {
  selection: string;
  ref: string;
  status: OrderStatus;
  clientName: string;
  clientEmail: string | null;
  photos: string[];
  included: number;
  extraPrice: number;
  extra: number;
  total: number;
  note: string | null;
  createdAt: string;
  paidAt?: string;
  deliveredAt?: string;
};
// Dane, na które klient wpłaca pieniądze fotografowi
export type Payout = { holder: string; account: string; blik: string };

export const MAX_INCLUDED = 2000;
export const MAX_EXTRA_PRICE = 2000;

export function saleOn(meta: GalleryMeta | null): boolean {
  return Boolean(meta?.sale?.enabled);
}

export function priceFor(count: number, sale: Pick<Sale, "included" | "extraPrice">) {
  const extra = Math.max(0, count - sale.included);
  return { extra, total: Math.round(extra * sale.extraPrice * 100) / 100 };
}

export function cleanSale(raw: unknown): Sale | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  const included = Math.floor(Number(r.included));
  const extraPrice = Math.round(Number(String(r.extraPrice ?? "").replace(",", ".")) * 100) / 100;
  if (!Number.isFinite(included) || included < 0 || included > MAX_INCLUDED) return null;
  if (!Number.isFinite(extraPrice) || extraPrice < 0 || extraPrice > MAX_EXTRA_PRICE) return null;
  return { enabled: Boolean(r.enabled), included, extraPrice };
}

// Numer konta: 26 cyfr (polski NRB), zapisywany w czytelnych grupach
export function formatAccount(digits: string) {
  const d = digits.replace(/\D/g, "");
  return d.length === 26 ? `${d.slice(0, 2)} ${d.slice(2).replace(/(\d{4})(?=\d)/g, "$1 ")}` : d;
}

export function cleanPayout(raw: unknown): { ok: true; payout: Payout } | { ok: false; error: string } {
  const r = (raw ?? {}) as Record<string, unknown>;
  const holder = String(r.holder ?? "").trim().slice(0, 100);
  const accountDigits = String(r.account ?? "").replace(/^\s*PL/i, "").replace(/[\s-]/g, "");
  const blikDigits = String(r.blik ?? "").replace(/^\s*\+?48/, "").replace(/[\s-]/g, "");
  if (accountDigits && !/^\d{26}$/.test(accountDigits)) return { ok: false, error: "Numer konta powinien mieć 26 cyfr." };
  if (blikDigits && !/^\d{9}$/.test(blikDigits)) return { ok: false, error: "Numer telefonu do BLIK powinien mieć 9 cyfr." };
  if (!accountDigits && !blikDigits) return { ok: false, error: "Podaj numer konta albo telefon do BLIK." };
  if (accountDigits && !holder) return { ok: false, error: "Podaj odbiorcę przelewu (imię i nazwisko albo nazwę firmy)." };
  return {
    ok: true,
    payout: {
      holder,
      account: accountDigits ? formatAccount(accountDigits) : "",
      blik: blikDigits ? blikDigits.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3") : "",
    },
  };
}

async function getJson<T>(key: string): Promise<T | null> {
  try {
    const res = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    const text = await res.Body?.transformToString();
    return text ? (JSON.parse(text) as T) : null;
  } catch {
    return null;
  }
}
const putJson = (key: string, v: unknown) =>
  r2.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: JSON.stringify(v), ContentType: "application/json" }));

// Dane do płatności fotografa
const payoutKey = (uid: string) => `profiles/${uid}/payout.json`;
export const getPayout = (uid: string) => getJson<Payout>(payoutKey(uid));
export const savePayout = (uid: string, p: Payout) => putJson(payoutKey(uid), p);

export async function getPayoutForGallery(galleryId: string): Promise<Payout | null> {
  const db = adminClient();
  if (!db) return null;
  const { data: g } = await db.from("galleries").select("owner_id").eq("id", galleryId).maybeSingle();
  return g?.owner_id ? getPayout(g.owner_id) : null;
}

// Zamówienia: galleries/<id>/orders/<id wyboru>.json (usuwane razem z galerią)
const orderKey = (galleryId: string, selection: string) => `${galleryPrefix(galleryId)}orders/${selection}.json`;
export const getSaleOrder = (galleryId: string, selection: string) => getJson<SaleOrder>(orderKey(galleryId, selection));
export const saveSaleOrder = (galleryId: string, o: SaleOrder) => putJson(orderKey(galleryId, o.selection), o);
export const deleteSaleOrder = (galleryId: string, selection: string) =>
  r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: orderKey(galleryId, selection) }));

export async function listSaleOrders(galleryId: string): Promise<Map<string, SaleOrder>> {
  const objs = await listObjects(`${galleryPrefix(galleryId)}orders/`).catch(() => []);
  const list = await Promise.all(objs.map((o) => getJson<SaleOrder>(o.key)));
  return new Map(list.filter((o): o is SaleOrder => Boolean(o)).map((o) => [o.selection, o]));
}

// Krótki kod zamówienia do tytułu przelewu
export const orderRef = (selection: string) => selection.replace(/-/g, "").slice(0, 6).toUpperCase();
