import { NextResponse } from "next/server";
import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { E } from "@/lib/api-lang";
import { getUser } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/owner";
import { r2, BUCKET, galleryPrefix, baseName } from "@/lib/r2";
import { listKeys } from "@/lib/photos";
import { getAlbumProject } from "@/lib/albums";
import { albumFormat, usedPhotos } from "@/lib/album-layout";
import { purchase } from "@/lib/purchase";
import {
  PRINT_FORMATS,
  PRINT_MAX_PAGES,
  printPages,
  printPrice,
  cleanShipping,
  newPrintId,
  getPrintOrder,
  savePrintOrder,
  zipUploadUrl,
  zipKey,
} from "@/lib/print";

export const runtime = "nodejs";

// Zamówienie wydrukowanego albumu: przygotowanie (pliki z oryginałów wgrywa przeglądarka), potem płatność
export async function POST(req: Request) {
  const { user } = await getUser();
  if (!user) return NextResponse.json({ error: await E("Zaloguj się ponownie.") }, { status: 401 });
  const body = (await req.json().catch(() => null)) as {
    action?: string;
    gallery?: string;
    order?: string;
    shipping?: unknown;
    copies?: number;
    pay?: string;
    invoice?: unknown;
  } | null;
  if (!body) return NextResponse.json({ error: await E("Nieprawidłowe dane.") }, { status: 400 });

  if (body.action === "prepare") {
    const id = String(body.gallery ?? "");
    const denied = await requireOwner(id);
    if (denied) return denied;
    const project = await getAlbumProject(id);
    if (!project?.spreads.length) return NextResponse.json({ error: "Najpierw wygeneruj projekt albumu." }, { status: 400 });
    const format = albumFormat(project.size).id;
    if (!PRINT_FORMATS.includes(format)) {
      return NextResponse.json({ error: "Druk zamówisz w formacie 15×15, 20×20 albo 25×25 cm – zmień format projektu." }, { status: 400 });
    }
    const pages = printPages(project.spreads.length);
    if (pages > PRINT_MAX_PAGES) {
      return NextResponse.json({ error: `Album do druku może mieć najwyżej ${PRINT_MAX_PAGES} stron – projekt ma ${pages}. Zmniejsz liczbę stron.` }, { status: 400 });
    }
    const sh = cleanShipping(body.shipping);
    if (!sh.ok) return NextResponse.json({ error: sh.error }, { status: 400 });
    const copies = Math.min(5, Math.max(1, Math.round(Number(body.copies) || 1)));
    const price = printPrice(format, pages)!;
    const total = price.album * copies + price.shipping;

    const order = {
      id: newPrintId(),
      uid: user.id,
      email: user.email ?? "",
      galleryId: id,
      title: project.title || id,
      format,
      pages,
      spreads: project.spreads.length,
      copies,
      price: total,
      shipping: sh.s,
      status: "draft" as const,
      createdAt: new Date().toISOString(),
    };
    await savePrintOrder(order);

    // oryginały zdjęć do wygenerowania plików (bez wymogu abonamentu – druk jest osobno płatny)
    const wanted = usedPhotos(project.spreads);
    const prefix = `${galleryPrefix(id)}original/`;
    const keys = (await listKeys(prefix)).filter((k) => wanted.has(baseName(k.slice(prefix.length))));
    const urls: Record<string, string> = {};
    await Promise.all(
      keys.map(async (k) => {
        urls[baseName(k.slice(prefix.length))] = await getSignedUrl(r2, new GetObjectCommand({ Bucket: BUCKET, Key: k }), { expiresIn: 7200 });
      }),
    );
    return NextResponse.json({ order: order.id, total, upload: await zipUploadUrl(order.id), urls });
  }

  const order = await getPrintOrder(String(body.order ?? ""));
  if (!order || order.uid !== user.id) return NextResponse.json({ error: "Nie znaleziono zamówienia." }, { status: 404 });

  if (body.action === "pay") {
    if (order.status !== "draft") return NextResponse.json({ error: "To zamówienie jest już opłacone." }, { status: 400 });
    const uploaded = await r2.send(new HeadObjectCommand({ Bucket: BUCKET, Key: zipKey(order.id) })).then(() => true).catch(() => false);
    if (!uploaded) return NextResponse.json({ error: "Pliki albumu nie zostały wysłane. Spróbuj jeszcze raz." }, { status: 400 });
    order.zip = true;
    await savePrintOrder(order);
    return purchase({
      req,
      user,
      amount: order.price,
      label: `wydruk albumu ${order.format}, ${order.pages} str.${order.copies > 1 ? ` × ${order.copies}` : ""} – ${order.title}`,
      pay: body.pay,
      invoice: body.invoice,
      action: { action: "product", product: "print", uid: user.id, orderId: order.id },
      returnPath: `/panel/galeria/${order.galleryId}`,
      galleryId: order.galleryId,
    });
  }

  return NextResponse.json({ error: await E("Nieprawidłowe dane.") }, { status: 400 });
}
