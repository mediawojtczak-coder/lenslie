import { getMeta, saveMeta, type GalleryMeta } from "@/lib/galleries";
import { getGalleryUsage } from "@/lib/photos";
import { PLANS, getPlan, isPeriod, addMonths, upgradeCost, planBytes, type Period, type PlanId } from "@/lib/plans";

export type PlanAction =
  | { action: "choose"; plan: PlanId; period: Period }
  | { action: "upgrade"; plan: PlanId }
  | { action: "extend"; period: Period };

type Checked = { ok: true; amount: number; action: PlanAction; label: string } | { ok: false; error: string };

// Sprawdza, czy operacja na pakiecie jest możliwa, i liczy kwotę do zapłaty (zł)
export async function checkAction(id: string, meta: GalleryMeta, body: { action?: string; plan?: string; period?: number }): Promise<Checked> {
  if (body.action === "choose") {
    const plan = getPlan(body.plan);
    if (!plan || !isPeriod(body.period)) return { ok: false, error: "Wybierz pakiet i okres." };
    if (meta.plan) return { ok: false, error: "Ta galeria jest już opublikowana." };
    const used = await getGalleryUsage(id);
    if (used > planBytes(plan) * 1.02) return { ok: false, error: "Zdjęcia w galerii nie mieszczą się w tym pakiecie." };
    return {
      ok: true,
      amount: plan.prices[body.period],
      action: { action: "choose", plan: plan.id, period: body.period },
      label: `publikacja galerii, pakiet ${plan.name}, ${body.period} mies.`,
    };
  }
  const current = getPlan(meta.plan);
  if (!current || !meta.period) return { ok: false, error: "Galeria nie ma jeszcze pakietu." };
  if (body.action === "upgrade") {
    const next = getPlan(body.plan);
    const order = PLANS.map((p) => p.id);
    if (!next || order.indexOf(next.id) <= order.indexOf(current.id)) {
      return { ok: false, error: "Pakiet można zmienić tylko na większy." };
    }
    return {
      ok: true,
      amount: upgradeCost(current, next, meta.period),
      action: { action: "upgrade", plan: next.id },
      label: `zmiana pakietu na ${next.name}`,
    };
  }
  if (body.action === "extend") {
    if (!isPeriod(body.period)) return { ok: false, error: "Wybierz okres." };
    return {
      ok: true,
      amount: current.prices[body.period],
      action: { action: "extend", period: body.period },
      label: `przedłużenie dostępu o ${body.period} mies.`,
    };
  }
  return { ok: false, error: "Nieznana operacja." };
}

// Wykonuje opłaconą operację (wywoływane po potwierdzeniu płatności albo w trybie testowym)
export async function applyAction(id: string, a: PlanAction) {
  const meta = await getMeta(id);
  if (!meta) throw new Error("Nie znaleziono galerii.");
  if (a.action === "choose") {
    if (meta.plan) return; // już opublikowana (np. powtórzone powiadomienie)
    meta.plan = a.plan;
    meta.period = a.period;
    meta.expiresAt = addMonths(new Date(), a.period).toISOString();
  } else if (a.action === "upgrade") {
    const order = PLANS.map((p) => p.id);
    if (order.indexOf(a.plan) > order.indexOf(meta.plan as PlanId)) meta.plan = a.plan;
  } else {
    const base = meta.expiresAt && new Date(meta.expiresAt) > new Date() ? new Date(meta.expiresAt) : new Date();
    meta.expiresAt = addMonths(base, a.period).toISOString();
    meta.notices = undefined;
  }
  await saveMeta(id, meta);
}
