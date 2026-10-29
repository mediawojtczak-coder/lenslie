import { PERIODS, type Period } from "@/lib/plans";
import { videoPrice } from "@/lib/videos";
import { isExpired, type GalleryMeta } from "@/lib/galleries";
import type { PlanAction } from "@/lib/plan-actions";

export const CLIENT_GRACE_DAYS = 30; // tyle dni po wygaśnięciu klient może jeszcze przedłużyć (potem galeria jest usuwana)
// Ceny przedłużenia płaconego przez klienta galerii (zł) – niezależnie od pakietu
export const CLIENT_PRICES: Record<Period, number> = { 1: 20, 3: 30, 6: 40, 12: 50 };
export const REMINDER_DAYS = [3, 7, 14] as const;
const DAY = 24 * 3600 * 1000;

export type ExtendOffer = {
  expiresAt: string;
  expired: boolean;
  daysLeft: number; // do wygaśnięcia (ujemne po wygaśnięciu)
  deleteOn: string;
  prices: { period: Period; amount: number }[];
  canExtend: boolean; // fotograf pozwala klientowi przedłużać
};

// Kwota dla klienta: stała cena + przechowanie filmów (jak przy przedłużeniu przez fotografa)
export function clientExtendPrice(meta: GalleryMeta, period: Period): { amount: number; action: PlanAction; label: string } {
  const vids = (meta.videos ?? []).filter((v) => v.status === "processing" || v.status === "ready");
  const videos = vids.reduce((s, v) => s + videoPrice(v.size, v.duration, period, false), 0);
  return {
    amount: CLIENT_PRICES[period] + videos,
    action: { action: "extend", period },
    label: `przedłużenie dostępu o ${period} mies.${vids.length ? ` (z filmami: ${vids.length})` : ""}`,
  };
}

export function clientExtendOn(meta: GalleryMeta | null) {
  // galerie w abonamencie Pro trwają razem z abonamentem fotografa – klient ich nie przedłuża
  if (!meta?.plan || meta.plan === "pro" || !meta.expiresAt || meta.clientExtend === false) return false;
  return Date.now() <= new Date(meta.expiresAt).getTime() + CLIENT_GRACE_DAYS * DAY;
}

// Czy klient może sam przedłużyć galerię i za ile
export async function clientExtendOffer(_id: string, meta: GalleryMeta | null): Promise<ExtendOffer | null> {
  if (!meta?.plan || meta.plan === "pro" || !meta.expiresAt) return null;
  const exp = new Date(meta.expiresAt).getTime();
  const canExtend = clientExtendOn(meta);
  if (!canExtend && isExpired(meta)) return null;
  return {
    expiresAt: meta.expiresAt,
    expired: isExpired(meta),
    daysLeft: Math.ceil((exp - Date.now()) / DAY),
    deleteOn: new Date(exp + CLIENT_GRACE_DAYS * DAY).toISOString(),
    prices: canExtend ? PERIODS.map((p) => ({ period: p, amount: clientExtendPrice(meta, p).amount })) : [],
    canExtend,
  };
}
