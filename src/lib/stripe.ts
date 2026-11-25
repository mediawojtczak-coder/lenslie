import { createHmac, timingSafeEqual } from "crypto";
import { curForCountry, type Cur } from "@/lib/foreign-prices";

// Stripe (płatności kartą, Apple Pay, Google Pay) – dla angielskiej wersji serwisu, w walucie kraju klienta.
// Dane w Vercelu: STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET.
// Na start tylko dla administratorów; dla wszystkich po ustawieniu STRIPE_PUBLIC=1.
export const stripeEnabled = () => Boolean(process.env.STRIPE_SECRET_KEY);

const admins = () =>
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

export function stripeAllowed(email: string | null | undefined) {
  if (!stripeEnabled()) return false;
  if (process.env.STRIPE_PUBLIC === "1") return true;
  return Boolean(email && admins().includes(email.toLowerCase()));
}

// Waluta płatności Stripe dla tej osoby albo null (wtedy złotówki i Przelewy24)
export async function stripeCurrency(email: string | null | undefined, lang?: "pl" | "en"): Promise<Cur | null> {
  if (!stripeAllowed(email)) return null;
  const { getLang } = await import("@/lib/lang-server");
  const l = lang ?? (await getLang().catch(() => "pl" as const));
  if (l !== "en") return null;
  const { headers } = await import("next/headers");
  const h = await headers().catch(() => null);
  return curForCountry(h?.get("x-vercel-ip-country"));
}

// Zapytanie do API Stripe (formularz application/x-www-form-urlencoded z zagnieżdżonymi kluczami)
function form(obj: Record<string, unknown>, prefix = "", out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((item, i) => (typeof item === "object" ? form(item as Record<string, unknown>, `${key}[${i}]`, out) : out.append(`${key}[${i}]`, String(item))));
    else if (typeof v === "object") form(v as Record<string, unknown>, key, out);
    else out.append(key, String(v));
  }
  return out;
}

export async function api<T>(method: "GET" | "POST", path: string, body?: Record<string, unknown>, idem?: string): Promise<T> {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      ...(idem ? { "Idempotency-Key": idem } : {}),
    },
    body: body ? form(body).toString() : undefined,
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!res.ok) {
    console.error("Stripe:", method, path, res.status, data?.error?.message);
    throw new Error("Bramka płatności nie przyjęła zamówienia. Spróbuj za chwilę.");
  }
  return data;
}

export type StripeSession = {
  id: string;
  url: string | null;
  payment_status: "paid" | "unpaid" | "no_payment_required";
  status: string;
  amount_total: number | null;
  currency: string | null;
  client_reference_id: string | null;
  payment_intent: string | null;
  metadata?: Record<string, string> | null;
};

// Strona płatności Stripe Checkout (karta, Apple Pay, Google Pay i inne metody włączone w panelu Stripe)
export async function createCheckout(o: {
  sid: string;
  amount: number; // w groszach/centach waluty
  cur: Cur;
  name: string;
  email: string;
  successUrl: string;
  cancelUrl: string;
  // Sprzedaż zdjęć: pieniądze idą na konto Stripe fotografa, Lenslie zatrzymuje prowizję
  connect?: { account: string; fee: number };
  metadata?: Record<string, string>;
}) {
  return api<StripeSession>(
    "POST",
    "checkout/sessions",
    {
      mode: "payment",
      locale: "en",
      client_reference_id: o.sid,
      customer_email: o.email || undefined,
      success_url: o.successUrl,
      cancel_url: o.cancelUrl,
      line_items: [{ quantity: 1, price_data: { currency: o.cur, unit_amount: o.amount, product_data: { name: o.name.slice(0, 250) } } }],
      metadata: { sid: o.sid, ...(o.metadata ?? {}) },
      payment_intent_data: {
        metadata: { sid: o.sid, ...(o.metadata ?? {}) },
        ...(o.connect
          ? { on_behalf_of: o.connect.account, transfer_data: { destination: o.connect.account }, application_fee_amount: o.connect.fee }
          : {}),
      },
    },
    `checkout-${o.sid}`,
  );
}

export const getCheckout = (id: string) => api<StripeSession>("GET", `checkout/sessions/${encodeURIComponent(id)}`);

// Sprawdzenie podpisu powiadomienia (nagłówek Stripe-Signature: t=…,v1=…)
export function webhookValid(raw: string, header: string | null) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]).filter((p) => p.length === 2));
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > 600) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${raw}`).digest();
  const sigs = header
    .split(",")
    .filter((p) => p.startsWith("v1="))
    .map((p) => Buffer.from(p.slice(3), "hex"));
  return sigs.some((s) => s.length === expected.length && timingSafeEqual(s, expected));
}
