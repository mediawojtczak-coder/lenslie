import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { E } from "@/lib/api-lang";
import { getUser } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/owner";
import { isValidGalleryId } from "@/lib/r2";
import { getMeta, saveMeta, hasAccess, accessCookieName, isExpired } from "@/lib/galleries";
import { purchase } from "@/lib/purchase";
import { activePro } from "@/lib/pro";
import { FACES_PRICE, indexGetUrl, indexPutUrl, deleteIndex, searchFaces } from "@/lib/faces";

export const runtime = "nodejs";

type Body = { action?: string; descriptor?: number[]; guestToken?: string; count?: number; pay?: string; invoice?: unknown; consent?: boolean };

// „Znajdź siebie na zdjęciach”: zakup i indeksowanie (fotograf) oraz wyszukiwanie (klient i goście)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidGalleryId(id)) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const body = ((await req.json().catch(() => null)) ?? {}) as Body;
  const meta = await getMeta(id);
  if (!meta) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Wyszukiwanie – bez logowania, ale tylko z dostępem do galerii
  if (body.action === "search") {
    const en = meta.lang === "en";
    const store = await cookies();
    const guestOk = Boolean(meta.guest?.enabled && body.guestToken && body.guestToken === meta.guest.token);
    if (isExpired(meta) || !meta.plan || (!guestOk && !hasAccess(id, meta, store.get(accessCookieName(id))?.value))) {
      return NextResponse.json({ error: en ? "No access." : "Brak dostępu." }, { status: 403 });
    }
    if (!meta.faces?.enabled || !meta.faces.paid) return NextResponse.json({ error: en ? "Not available." : "Funkcja jest wyłączona." }, { status: 400 });
    const d = Array.isArray(body.descriptor) ? body.descriptor.map(Number) : [];
    if (d.length !== 128 || d.some((x) => !Number.isFinite(x))) return NextResponse.json({ error: "Invalid" }, { status: 400 });
    return NextResponse.json({ ok: true, names: await searchFaces(id, d) });
  }

  const denied = await requireOwner(id);
  if (denied) return denied;
  const { user } = await getUser();
  if (!user) return NextResponse.json({ error: await E("Zaloguj się ponownie.") }, { status: 401 });

  switch (body.action) {
    case "buy": {
      if (!body.consent) return NextResponse.json({ error: await E("Potwierdź zgody osób na zdjęciach.") }, { status: 400 });
      meta.faces = { ...(meta.faces ?? { enabled: false }), consentAt: new Date().toISOString() };
      await saveMeta(id, meta);
      if (meta.faces.paid) return NextResponse.json({ ok: true });
      return purchase({
        req,
        user,
        amount: (await activePro(user.id)) ? 0 : FACES_PRICE,
        label: `Znajdź siebie na zdjęciach – ${meta.title}`,
        pay: body.pay,
        invoice: body.invoice,
        action: { action: "product", product: "faces", uid: user.id, galleryId: id },
        returnPath: `/panel/galeria/${id}?tab=ustawienia`,
        galleryId: id,
      });
    }
    case "index-urls": {
      if (!meta.faces?.paid) return NextResponse.json({ error: await E("Najpierw włącz tę funkcję.") }, { status: 402 });
      return NextResponse.json({ ok: true, get: meta.faces.indexed ? await indexGetUrl(id) : null, put: await indexPutUrl(id) });
    }
    case "index-done": {
      meta.faces = { ...(meta.faces ?? { enabled: true }), enabled: true, indexed: Math.max(0, Number(body.count) || 0) };
      await saveMeta(id, meta);
      return NextResponse.json({ ok: true });
    }
    case "toggle": {
      if (!meta.faces?.paid) return NextResponse.json({ error: await E("Najpierw włącz tę funkcję.") }, { status: 402 });
      meta.faces.enabled = !meta.faces.enabled;
      if (!meta.faces.enabled) {
        // Wyłączenie usuwa opisy twarzy – przy ponownym włączeniu zdjęcia indeksujemy od nowa
        await deleteIndex(id);
        meta.faces.indexed = 0;
      }
      await saveMeta(id, meta);
      return NextResponse.json({ ok: true });
    }
  }
  return NextResponse.json({ error: await E("Nieznana operacja.") }, { status: 400 });
}
