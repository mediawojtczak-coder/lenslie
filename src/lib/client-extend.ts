import { checkAction } from "@/lib/plan-actions";
import { PERIODS, type Period } from "@/lib/plans";
import { isExpired, type GalleryMeta } from "@/lib/galleries";

export const CLIENT_GRACE_DAYS = 30; // tyle dni po wygaśnięciu klient może jeszcze przedłużyć (potem galeria jest usuwana)
const DAY = 24 * 3600 * 1000;

export type ExtendOffer = {
  expiresAt: string;
  expired: boolean;
  daysLeft: number; // do wygaśnięcia (ujemne po wygaśnięciu)
  deleteOn: string;
  prices: { period: Period; amount: number }[];
};

// Czy klient może sam przedłużyć galerię i za ile (te same ceny co dla fotografa, razem z filmami)
export async function clientExtendOffer(id: string, meta: GalleryMeta | null): Promise<ExtendOffer | null> {
  if (!meta?.plan || !meta.expiresAt || meta.clientExtend === false) return null;
  const exp = new Date(meta.expiresAt).getTime();
  const deleteOn = exp + CLIENT_GRACE_DAYS * DAY;
  if (Date.now() > deleteOn) return null;
  const prices: { period: Period; amount: number }[] = [];
  for (const p of PERIODS) {
    const c = await checkAction(id, meta, { action: "extend", period: p });
    if (c.ok) prices.push({ period: p, amount: c.amount });
  }
  if (!prices.length) return null;
  return {
    expiresAt: meta.expiresAt,
    expired: isExpired(meta),
    daysLeft: Math.ceil((exp - Date.now()) / DAY),
    deleteOn: new Date(deleteOn).toISOString(),
    prices,
  };
}
