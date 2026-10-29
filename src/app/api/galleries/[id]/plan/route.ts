import { NextResponse } from "next/server";
import { E } from "@/lib/api-lang";
import { isValidGalleryId } from "@/lib/r2";
import { getMeta, saveMeta } from "@/lib/galleries";
import { getUser } from "@/lib/supabase/server";
import { checkAction, applyAction } from "@/lib/plan-actions";
import { p24Enabled, newSessionId, saveOrder, registerTransaction } from "@/lib/p24";
import { cleanBilling, saveBilling } from "@/lib/billing";
import { spend, getWallet, zlFromGr } from "@/lib/wallet";
import { notifyAdmins } from "@/lib/email";
import { getLang } from "@/lib/lang-server";
import { activePro, proFits, proGraceEnd, proName } from "@/lib/pro";
import { getGalleryUsage } from "@/lib/photos";
import { formatBytes } from "@/lib/plans";

export const runtime = "nodejs";

// Publikacja, zmiana pakietu i przedłużenie. Z Przelewy24: zwraca adres płatności; bez nich (tryb testowy) wykonuje od razu.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: await E("Zaloguj się ponownie.") }, { status: 401 });
  if (!isValidGalleryId(id)) return NextResponse.json({ error: await E("Nieprawidłowa galeria.") }, { status: 400 });

  const { data: own } = await supabase.from("galleries").select("id").eq("id", id).maybeSingle();
  if (!own) return NextResponse.json({ error: await E("To nie jest Twoja galeria.") }, { status: 403 });

  const body = ((await req.json().catch(() => null)) ?? {}) as { action?: string; plan?: string; period?: number; invoice?: unknown; pay?: string };
  const meta = await getMeta(id);
  if (!meta) return NextResponse.json({ error: await E("Nie znaleziono galerii.") }, { status: 404 });

  // Abonament Pro: publikacja bez opłaty (albo przeniesienie opłaconej galerii do puli abonamentu)
  if (body.action === "pro") {
    const sub = await activePro(user.id);
    if (!sub) return NextResponse.json({ error: await E("Abonament Pro nie jest aktywny.") }, { status: 402 });
    if (meta.plan === "pro") return NextResponse.json({ ok: true });
    // wersja robocza jest już liczona do puli; opłaconą galerię doliczamy
    const extra = meta.plan ? (await getGalleryUsage(id)) + (meta.videos ?? []).reduce((s, v) => s + (v.size || 0), 0) : 0;
    const fit = await proFits(user.id, sub, extra);
    if (!fit.ok) {
      const en = (await getLang()) === "en";
      return NextResponse.json(
        {
          error: en
            ? `This gallery won't fit in ${proName(fit.tier)} (used: ${formatBytes(fit.used)}). Upgrade your plan or free up space.`
            : `Ta galeria nie zmieści się w abonamencie ${proName(fit.tier)} (zajęte: ${formatBytes(fit.used)}). Zmień pakiet na większy albo zwolnij miejsce.`,
        },
        { status: 402 },
      );
    }
    meta.plan = "pro";
    meta.period = undefined;
    meta.expiresAt = proGraceEnd(sub).toISOString();
    meta.notices = undefined;
    await saveMeta(id, meta);
    return NextResponse.json({ ok: true, pro: true });
  }

  const checked = await checkAction(id, meta, body);
  if (!checked.ok) return NextResponse.json({ error: await E(checked.error) }, { status: 400 });

  // Dane do faktury: sprawdzamy i zapamiętujemy na kolejne zakupy
  const inv = cleanBilling(body.invoice);
  if (!inv.ok) return NextResponse.json({ error: await E(inv.error) }, { status: 400 });
  if (body.invoice) await saveBilling(user.id, inv.billing).catch(() => undefined);

  // Płatność z salda konta
  if (body.pay === "wallet" && checked.amount > 0) {
    const ref = newSessionId();
    const ok = await spend(user.id, Math.round(checked.amount * 100), `${checked.label} – ${meta.title}`, ref);
    if (!ok) return NextResponse.json({ error: await E("Za mało środków na koncie. Doładuj konto albo zapłać BLIK-iem.") }, { status: 402 });
    await applyAction(id, checked.action);
    const left = (await getWallet(user.id)).balance;
    const kwota = zlFromGr(Math.round(checked.amount * 100));
    await notifyAdmins(`Zakup z salda: ${kwota} – ${user.email}`, "Nowy zakup z salda", [
      `Kwota: ${kwota} (z salda konta).`,
      `Za: ${checked.label} – ${meta.title}.`,
      `Konto: ${user.email}. Pozostało na saldzie: ${zlFromGr(left)}.`,
      "Faktura była wystawiona przy doładowaniu – nic nie trzeba robić.",
    ]);
    return NextResponse.json({ ok: true, charged: checked.amount, wallet: true });
  }

  // Nic do zapłaty albo brak bramki (tryb testowy): od razu
  if (checked.amount <= 0 || !p24Enabled()) {
    await applyAction(id, checked.action);
    return NextResponse.json({ ok: true, charged: checked.amount, test: !p24Enabled() });
  }

  const order = {
    sessionId: newSessionId(),
    galleryId: id,
    ownerId: user.id,
    email: user.email ?? "",
    amount: Math.round(checked.amount * 100),
    action: checked.action,
    description: `Lenslie - ${checked.label} - ${meta.title}`.slice(0, 1024),
    status: "pending" as const,
    invoice: inv.billing.want ? inv.billing : null,
    createdAt: new Date().toISOString(),
  };
  await saveOrder(order);
  try {
    const redirect = await registerTransaction(order, new URL(req.url).origin);
    return NextResponse.json({ ok: true, redirect });
  } catch (err) {
    return NextResponse.json({ error: await E(err instanceof Error ? err.message : "Błąd płatności.") }, { status: 502 });
  }
}
