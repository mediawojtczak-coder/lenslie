import { NextResponse } from "next/server";
import { E } from "@/lib/api-lang";
import { getUser } from "@/lib/supabase/server";
import { getLang } from "@/lib/lang-server";
import { cleanBilling, saveBilling } from "@/lib/billing";
import { spend, getWallet, zlFromGr } from "@/lib/wallet";
import { notifyAdmins } from "@/lib/email";
import { p24Enabled, newSessionId, saveOrder, registerTransaction } from "@/lib/p24";
import {
  createGuestEvent,
  getGuestEvent,
  saveGuestEvent,
  activateGuestEvent,
  deleteGuestEvent,
  deleteGuestPhoto,
  GUEST_PRICE,
} from "@/lib/guest-events";

export const runtime = "nodejs";

type Body = Record<string, unknown> & { action?: string; id?: string };

// Zdjęcia od gości – obsługa przez fotografa: tworzenie, ustawienia, opłata, moderacja
export async function POST(req: Request) {
  const { user } = await getUser();
  if (!user) return NextResponse.json({ error: await E("Zaloguj się ponownie.") }, { status: 401 });
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body) return NextResponse.json({ error: await E("Nieprawidłowe dane.") }, { status: 400 });

  if (body.action === "create") {
    const title = String(body.title ?? "").trim().slice(0, 100);
    if (!title) return NextResponse.json({ error: await E("Wpisz nazwę.") }, { status: 400 });
    const e = await createGuestEvent(user.id, title, await getLang());
    return NextResponse.json({ ok: true, id: e.id });
  }

  const e = await getGuestEvent(String(body.id ?? ""));
  if (!e || e.uid !== user.id) return NextResponse.json({ error: await E("Nie znaleziono wydarzenia.") }, { status: 404 });

  switch (body.action) {
    case "save": {
      const title = String(body.title ?? "").trim().slice(0, 100);
      if (!title) return NextResponse.json({ error: await E("Wpisz nazwę.") }, { status: 400 });
      const date = String(body.date ?? "");
      e.title = title;
      e.date = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
      e.welcome = String(body.welcome ?? "").trim().slice(0, 1000);
      e.lang = body.lang === "en" ? "en" : "pl";
      e.showWall = Boolean(body.showWall);
      e.allowDownload = Boolean(body.allowDownload);
      await saveGuestEvent(e);
      return NextResponse.json({ ok: true });
    }
    case "pay": {
      if (e.status === "active") return NextResponse.json({ error: await E("To wydarzenie jest już aktywne.") }, { status: 400 });
      const inv = cleanBilling(body.invoice);
      if (!inv.ok) return NextResponse.json({ error: await E(inv.error) }, { status: 400 });
      if (body.invoice) await saveBilling(user.id, inv.billing).catch(() => undefined);
      const label = `Zdjęcia od gości – ${e.title}`;
      const amountGr = GUEST_PRICE * 100;

      if (body.pay === "wallet") {
        const ok = await spend(user.id, amountGr, label, `guest-${e.id}`);
        if (!ok) return NextResponse.json({ error: await E("Za mało środków na koncie. Doładuj konto albo zapłać BLIK-iem.") }, { status: 402 });
        await activateGuestEvent(e.id);
        const left = (await getWallet(user.id)).balance;
        await notifyAdmins(`Zakup z salda: ${zlFromGr(amountGr)} – ${user.email}`, "Nowy zakup z salda", [
          `Kwota: ${zlFromGr(amountGr)} (z salda konta).`,
          `Za: ${label}.`,
          `Konto: ${user.email}. Pozostało na saldzie: ${zlFromGr(left)}.`,
        ]);
        return NextResponse.json({ ok: true });
      }
      if (!p24Enabled()) {
        await activateGuestEvent(e.id);
        return NextResponse.json({ ok: true, test: true });
      }
      const order = {
        sessionId: newSessionId(),
        galleryId: "",
        ownerId: user.id,
        email: user.email ?? "",
        amount: amountGr,
        action: { action: "guest-event" as const, eventId: e.id },
        returnPath: `/panel/goscie/${e.id}`,
        description: `Lenslie - zdjecia od gosci - ${e.title}`.slice(0, 1024),
        status: "pending" as const,
        invoice: inv.billing.want ? inv.billing : null,
        createdAt: new Date().toISOString(),
      };
      await saveOrder(order);
      try {
        return NextResponse.json({ ok: true, redirect: await registerTransaction(order, new URL(req.url).origin) });
      } catch (err) {
        return NextResponse.json({ error: await E(err instanceof Error ? err.message : "Błąd płatności.") }, { status: 502 });
      }
    }
    case "delete-photo": {
      const name = String(body.name ?? "");
      if (!/^[A-Za-z0-9._-]{1,200}$/.test(name)) return NextResponse.json({ error: await E("Nieprawidłowe dane.") }, { status: 400 });
      await deleteGuestPhoto(e.id, name);
      return NextResponse.json({ ok: true });
    }
    case "delete": {
      await deleteGuestEvent(e);
      return NextResponse.json({ ok: true });
    }
  }
  return NextResponse.json({ error: await E("Nieznana operacja.") }, { status: 400 });
}
