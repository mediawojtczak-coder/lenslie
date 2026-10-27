import { NextResponse } from "next/server";
import { E } from "@/lib/api-lang";
import { getUser } from "@/lib/supabase/server";
import { spend, getWallet, zlFromGr, addEntries } from "@/lib/wallet";
import { notifyAdmins } from "@/lib/email";
import { addMonths } from "@/lib/plans";
import {
  DOMAIN_PRICE,
  cleanHost,
  getDomainByHost,
  getDomainByUser,
  saveDomain,
  deleteDomain,
  domainActive,
  vercelEnabled,
  vercelAddDomain,
  vercelRemoveDomain,
  vercelDomainStatus,
} from "@/lib/domains";

export const runtime = "nodejs";

// Własna domena fotografa: zakup (z salda), zmiana adresu, przedłużenie, usunięcie, sprawdzenie DNS
export async function POST(req: Request) {
  const { user } = await getUser();
  if (!user) return NextResponse.json({ error: await E("Zaloguj się ponownie.") }, { status: 401 });
  if (!vercelEnabled()) return NextResponse.json({ error: await E("Własne domeny nie są jeszcze włączone.") }, { status: 503 });

  const body = ((await req.json().catch(() => null)) ?? {}) as { action?: string; host?: string };
  const current = await getDomainByUser(user.id);
  const price = DOMAIN_PRICE * 100;

  if (body.action === "status") {
    if (!current) return NextResponse.json({ error: await E("Brak domeny.") }, { status: 404 });
    return NextResponse.json({ ok: true, ...(await vercelDomainStatus(current.host)) });
  }

  if (body.action === "buy" || body.action === "change") {
    const host = cleanHost(body.host);
    if (!host) return NextResponse.json({ error: await E("Wpisz subdomenę, np. galerie.twojastrona.pl") }, { status: 400 });
    const taken = await getDomainByHost(host);
    if (taken && taken.uid !== user.id) return NextResponse.json({ error: await E("Ta domena jest już przypisana do innego konta.") }, { status: 409 });
    if (current?.host === host) return NextResponse.json({ ok: true });

    // Zakup: pobieramy opłatę z salda; zmiana adresu w trakcie opłaconego okresu jest bezpłatna
    const paidActive = domainActive(current);
    if (!paidActive) {
      const ok = await spend(user.id, price, `Własna domena ${host} – 12 mies.`, `domain-${host}-${Date.now()}`);
      if (!ok) return NextResponse.json({ error: await E("Za mało środków na saldzie."), code: "FUNDS" }, { status: 402 });
    }
    const err = await vercelAddDomain(host);
    if (err) {
      if (!paidActive) {
        await addEntries(user.id, [{ type: "refund", amount: price, description: `Zwrot – domena ${host} nie została podłączona` }]);
      }
      return NextResponse.json({ error: await E(err) }, { status: 400 });
    }
    if (current && current.host !== host) {
      await vercelRemoveDomain(current.host);
      await deleteDomain(current);
    }
    await saveDomain({
      host,
      uid: user.id,
      addedAt: new Date().toISOString(),
      paidUntil: paidActive ? current!.paidUntil : addMonths(new Date(), 12).toISOString(),
    });
    if (!paidActive) {
      await notifyAdmins(`Zakup domeny: ${DOMAIN_PRICE} zł – ${user.email}`, "Nowy zakup: własna domena", [
        `Domena: ${host} (12 mies., z salda).`,
        `Konto: ${user.email}. Pozostało na saldzie: ${zlFromGr((await getWallet(user.id)).balance)}.`,
      ]);
    }
    return NextResponse.json({ ok: true, ...(await vercelDomainStatus(host)) });
  }

  if (body.action === "renew") {
    if (!current) return NextResponse.json({ error: await E("Brak domeny.") }, { status: 404 });
    const ok = await spend(user.id, price, `Przedłużenie domeny ${current.host} – 12 mies.`, `domain-renew-${Date.now()}`);
    if (!ok) return NextResponse.json({ error: await E("Za mało środków na saldzie."), code: "FUNDS" }, { status: 402 });
    const base = domainActive(current) ? new Date(current.paidUntil) : new Date();
    await saveDomain({ ...current, paidUntil: addMonths(base, 12).toISOString(), reminded: false, detached: false });
    if (!domainActive(current)) await vercelAddDomain(current.host);
    await notifyAdmins(`Przedłużenie domeny: ${DOMAIN_PRICE} zł – ${user.email}`, "Przedłużenie własnej domeny", [
      `Domena: ${current.host}, konto ${user.email}.`,
    ]);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "remove") {
    if (current) {
      await vercelRemoveDomain(current.host);
      await deleteDomain(current);
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: await E("Nieznana operacja.") }, { status: 400 });
}
