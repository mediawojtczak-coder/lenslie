import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidGalleryId } from "@/lib/r2";
import { getMeta, hasAccess, accessCookieName, isExpired } from "@/lib/galleries";
import { clientExtendOffer, clientExtendPrice } from "@/lib/client-extend";
import { isPeriod } from "@/lib/plans";
import { adminClient } from "@/lib/supabase/admin";
import { p24Enabled, newSessionId, saveOrder, registerTransaction } from "@/lib/p24";
import { siteUrl } from "@/lib/email";

export const runtime = "nodejs";

// Klient galerii sam przedłuża dostęp (płatność Przelewy24 – trafia do Lenslie, jak przedłużenie przez fotografa)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { period?: number; email?: string };
  const en = req.headers.get("accept-language")?.startsWith("en");
  const err = (pl: string, eng: string, status = 400) => NextResponse.json({ error: en ? eng : pl }, { status });

  if (!isValidGalleryId(id)) return err("Nie znaleziono galerii.", "Gallery not found.", 404);
  const meta = await getMeta(id).catch(() => null);
  const offer = await clientExtendOffer(id, meta);
  if (!meta || !offer?.canExtend) return err("Tej galerii nie można przedłużyć.", "This gallery can't be extended.");
  // Aktywna galeria z hasłem: przedłużyć może tylko ktoś, kto ją otworzył
  const store = await cookies();
  if (!isExpired(meta) && !hasAccess(id, meta, store.get(accessCookieName(id))?.value)) {
    return err("Otwórz galerię, aby ją przedłużyć.", "Open the gallery to extend it.", 403);
  }
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) return err("Podaj poprawny adres e-mail.", "Enter a valid e-mail address.");
  if (!isPeriod(body.period)) return err("Wybierz okres.", "Choose a period.");
  const c = clientExtendPrice(meta, body.period);
  if (!p24Enabled()) return err("Płatności są chwilowo niedostępne.", "Payments are temporarily unavailable.", 503);

  const db = adminClient();
  const owner = db ? (await db.from("galleries").select("owner_id").eq("id", id).maybeSingle()).data?.owner_id : null;
  if (!owner) return err("Nie udało się rozpocząć płatności.", "Could not start the payment.", 500);

  const order = {
    sessionId: newSessionId(),
    galleryId: id,
    ownerId: owner as string,
    email,
    amount: Math.round(c.amount * 100),
    action: c.action,
    returnPath: `/galeria/${id}`,
    description: `Lenslie - ${c.label} (klient) - ${meta.title ?? id}`.replace(/[–—]/g, "-").slice(0, 1024),
    status: "pending" as const,
    byClient: true,
    invoice: null,
    createdAt: new Date().toISOString(),
  };
  await saveOrder(order);
  try {
    return NextResponse.json({ ok: true, redirect: await registerTransaction(order, siteUrl()) });
  } catch {
    return err("Bramka płatności nie przyjęła zamówienia. Spróbuj za chwilę.", "The payment gateway is unavailable. Try again shortly.", 502);
  }
}
