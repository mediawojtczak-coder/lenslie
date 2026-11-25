import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { r2, BUCKET, galleryPrefix } from "@/lib/r2";
import { listObjects } from "@/lib/photos";
import { adminClient } from "@/lib/supabase/admin";
import type { GalleryMeta } from "@/lib/galleries";
import { isCur, type Cur } from "@/lib/foreign-prices";

// Sprzedaż zdjęć w galerii: klient wybiera zdjęcia do pakietu, za dodatkowe dopłaca fotografowi
// (przelewem albo BLIK-iem na telefon), fotograf potwierdza wpłatę i udostępnia zdjęcia bez znaku wodnego.

// cur – waluta w galeriach angielskich z płatnością kartą (Stripe); bez niej złotówki
export type Sale = { enabled: boolean; included: number; extraPrice: number; cur?: Cur };
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
  // Domówienie: zdjęcia z wcześniejszych, już udostępnionych zamówień (klient dalej je pobiera) i numer rundy
  deliveredPhotos?: string[];
  round?: number;
  // Płatność kartą w galerii (Stripe, galerie angielskie)
  cur?: Cur;
  paidBy?: "card";
  stripeSession?: string;
};

// Zdjęcia, które klient może już pobrać bez znaku wodnego
export const unlockedPhotos = (o: SaleOrder | null) => (o ? (o.status === "delivered" ? o.photos : (o.deliveredPhotos ?? [])) : []);
// Dane, na które klient wpłaca pieniądze fotografowi
// account: polski numer (26 cyfr) albo IBAN; swift i paypal – dla fotografów spoza Polski
export type Payout = { holder: string; account: string; blik: string; swift?: string; paypal?: string };

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
  return { enabled: Boolean(r.enabled), included, extraPrice, ...(isCur(r.cur) ? { cur: r.cur } : {}) };
}

// Waluta sprzedaży: tylko galerie angielskie mogą mieć €, $ albo £
export const saleCur = (meta: GalleryMeta | null): Cur | null =>
  meta?.lang === "en" && isCur(meta?.sale?.cur) ? meta!.sale!.cur! : null;

// Numer konta: 26 cyfr (polski NRB), zapisywany w czytelnych grupach
export function formatAccount(digits: string) {
  const d = digits.replace(/\D/g, "");
  return d.length === 26 ? `${d.slice(0, 2)} ${d.slice(2).replace(/(\d{4})(?=\d)/g, "$1 ")}` : d;
}

// IBAN: kraj (2 litery), 2 cyfry kontrolne, do 30 znaków; sprawdzenie sumy kontrolnej mod 97
export function ibanValid(raw: string) {
  const v = raw.replace(/\s/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(v)) return false;
  const moved = v.slice(4) + v.slice(0, 4);
  const digits = moved.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let rem = 0;
  for (const d of digits) rem = (rem * 10 + Number(d)) % 97;
  return rem === 1;
}
const groups = (v: string) => v.replace(/(.{4})(?=.)/g, "$1 ");

export function cleanPayout(raw: unknown): { ok: true; payout: Payout } | { ok: false; error: string } {
  const r = (raw ?? {}) as Record<string, unknown>;
  const holder = String(r.holder ?? "").trim().slice(0, 100);
  const accRaw = String(r.account ?? "").trim().replace(/[\s-]/g, "").toUpperCase();
  const blikDigits = String(r.blik ?? "").replace(/^\s*\+?48/, "").replace(/[\s-]/g, "");
  const swift = String(r.swift ?? "").replace(/\s/g, "").toUpperCase().slice(0, 11);
  const paypalRaw = String(r.paypal ?? "").trim().slice(0, 120);
  // polski numer (z PL albo bez) albo zagraniczny IBAN
  let account = "";
  if (accRaw) {
    const pl = accRaw.replace(/^PL/, "");
    if (/^\d{26}$/.test(pl)) account = formatAccount(pl);
    else if (ibanValid(accRaw)) account = groups(accRaw);
    else return { ok: false, error: "Numer konta powinien mieć 26 cyfr." };
  }
  if (swift && !/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(swift)) return { ok: false, error: "Sprawdź kod SWIFT/BIC." };
  let paypal = "";
  if (paypalRaw) {
    const link = paypalRaw.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
    if (/^paypal\.me\/[A-Za-z0-9_.-]{2,40}$/i.test(link)) paypal = `https://${link}`;
    else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paypalRaw)) paypal = paypalRaw.toLowerCase();
    else return { ok: false, error: "PayPal: podaj adres e-mail albo link paypal.me." };
  }
  if (blikDigits && !/^\d{9}$/.test(blikDigits)) return { ok: false, error: "Numer telefonu do BLIK powinien mieć 9 cyfr." };
  if (!account && !blikDigits && !paypal) return { ok: false, error: "Podaj numer konta albo telefon do BLIK." };
  if (account && !holder) return { ok: false, error: "Podaj odbiorcę przelewu (imię i nazwisko albo nazwę firmy)." };
  return {
    ok: true,
    payout: {
      holder,
      account,
      blik: blikDigits ? blikDigits.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3") : "",
      ...(swift ? { swift } : {}),
      ...(paypal ? { paypal } : {}),
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
