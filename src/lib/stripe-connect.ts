import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { r2, BUCKET } from "@/lib/r2";
import { api, stripeAllowed } from "@/lib/stripe";
import { adminClient } from "@/lib/supabase/admin";
import type { GalleryMeta } from "@/lib/galleries";
import { saleCur } from "@/lib/sales";

// Stripe Connect: fotograf z angielskiej wersji podłącza własne konto Stripe (Express),
// a klienci płacą mu kartą za dodatkowe zdjęcia prosto w galerii.
export type Connect = { account: string; country: string; ready: boolean; details: boolean; updatedAt: string };

const key = (uid: string) => `profiles/${uid}/stripe-connect.json`;

export async function getConnect(uid: string): Promise<Connect | null> {
  try {
    const res = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key(uid) }));
    const text = await res.Body?.transformToString();
    return text ? (JSON.parse(text) as Connect) : null;
  } catch {
    return null;
  }
}
const saveConnect = (uid: string, c: Connect) =>
  r2.send(new PutObjectCommand({ Bucket: BUCKET, Key: key(uid), Body: JSON.stringify(c), ContentType: "application/json" }));

// Prowizja Lenslie od sprzedaży zdjęć (zatwierdzone 25.11.2026):
// bez Pro – 5% (w tym opłata za kartę, którą płaci Lenslie); z Pro – 0% prowizji, tylko koszt karty (ok. 3% + 0,30).
export const SALES_FEE_PERCENT = () => Math.min(30, Math.max(0, Number(process.env.STRIPE_SALES_FEE ?? "5") || 0));
export const CARD_COST = { percent: 3, fixed: 30 }; // fixed – w groszach/centach waluty
export function salesFee(amountMinor: number, pro: boolean) {
  const fee = pro
    ? Math.round((amountMinor * CARD_COST.percent) / 100) + CARD_COST.fixed
    : Math.round((amountMinor * SALES_FEE_PERCENT()) / 100);
  return Math.max(0, Math.min(fee, amountMinor - 1));
}

// Kraje, w których fotograf może założyć konto Stripe Express (najczęstsze dla Lenslie)
export const CONNECT_COUNTRIES: [string, string][] = [
  ["GB", "United Kingdom"], ["IE", "Ireland"], ["US", "United States"], ["CA", "Canada"], ["AU", "Australia"], ["NZ", "New Zealand"],
  ["DE", "Germany"], ["AT", "Austria"], ["CH", "Switzerland"], ["NL", "Netherlands"], ["BE", "Belgium"], ["LU", "Luxembourg"],
  ["FR", "France"], ["ES", "Spain"], ["PT", "Portugal"], ["IT", "Italy"], ["DK", "Denmark"], ["SE", "Sweden"], ["NO", "Norway"],
  ["FI", "Finland"], ["PL", "Poland"], ["CZ", "Czechia"], ["SK", "Slovakia"], ["LT", "Lithuania"], ["LV", "Latvia"], ["EE", "Estonia"],
  ["HU", "Hungary"], ["RO", "Romania"], ["BG", "Bulgaria"], ["HR", "Croatia"], ["SI", "Slovenia"], ["GR", "Greece"], ["CY", "Cyprus"], ["MT", "Malta"],
];

type Account = { id: string; charges_enabled: boolean; details_submitted: boolean; country: string };

export async function startConnect(uid: string, email: string, country: string, origin: string) {
  let c = await getConnect(uid);
  if (!c) {
    const acc = await api<Account>(
      "POST",
      "accounts",
      {
        type: "express",
        country,
        email,
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        business_profile: { mcc: "7221", product_description: "Photography – digital photos sold from online client galleries (Lenslie)" },
        metadata: { uid },
      },
      `connect-${uid}`,
    );
    c = { account: acc.id, country: acc.country, ready: acc.charges_enabled, details: acc.details_submitted, updatedAt: new Date().toISOString() };
    await saveConnect(uid, c);
  }
  const link = await api<{ url: string }>("POST", "account_links", {
    account: c.account,
    type: "account_onboarding",
    refresh_url: `${origin}/api/stripe-connect?again=1`,
    return_url: `${origin}/api/stripe-connect?back=1`,
  });
  return link.url;
}

// Odświeżenie stanu konta (po powrocie z Stripe i przy wejściu w ustawienia)
export async function refreshConnect(uid: string) {
  const c = await getConnect(uid);
  if (!c) return null;
  const acc = await api<Account>("GET", `accounts/${c.account}`).catch(() => null);
  if (!acc) return c;
  const next = { ...c, ready: acc.charges_enabled, details: acc.details_submitted, updatedAt: new Date().toISOString() };
  if (next.ready !== c.ready || next.details !== c.details) await saveConnect(uid, next);
  return next;
}

export async function connectDashboard(uid: string) {
  const c = await getConnect(uid);
  if (!c) return null;
  const link = await api<{ url: string }>("POST", `accounts/${c.account}/login_links`, {});
  return link.url;
}

// Czy klienci tej galerii mogą płacić kartą: galeria angielska, waluta ustawiona, fotograf ma gotowe konto Stripe
export async function cardSales(galleryId: string, meta: GalleryMeta | null): Promise<{ account: string; owner: string } | null> {
  if (!saleCur(meta)) return null;
  const db = adminClient();
  if (!db) return null;
  const { data: g } = await db.from("galleries").select("owner_id").eq("id", galleryId).maybeSingle();
  if (!g?.owner_id) return null;
  const [c, owner] = await Promise.all([getConnect(g.owner_id), db.auth.admin.getUserById(g.owner_id).catch(() => null)]);
  if (!c?.ready || !stripeAllowed(owner?.data?.user?.email)) return null;
  return { account: c.account, owner: g.owner_id as string };
}
