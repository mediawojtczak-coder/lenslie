import { spend } from "@/lib/wallet";
import { stripeCurrency } from "@/lib/stripe";
import { foreignAmount } from "@/lib/checkout";
import type { Order } from "@/lib/p24";

// Płatność z salda: w wersji angielskiej z kartą – z salda w walucie fotografa (kwota z cennika w €/$/£),
// w polskiej – z salda w złotych. Zwraca false, gdy środków jest za mało.
export async function spendAny(
  user: { id: string; email?: string | null },
  plnGrosze: number,
  description: string,
  ref: string,
  ctx: { action: Order["action"]; galleryId?: string },
) {
  const cur = await stripeCurrency(user.email).catch(() => null);
  if (cur) {
    const pseudo = { action: ctx.action, amount: plnGrosze, galleryId: ctx.galleryId ?? "" } as Order;
    const amt = await foreignAmount(pseudo, cur);
    if (amt != null) return spend(user.id, Math.round(amt * 100), description, ref, cur);
  }
  return spend(user.id, plnGrosze, description, ref);
}
