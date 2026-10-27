import { NextResponse } from "next/server";
import { isValidGalleryId } from "@/lib/r2";
import { adminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const KINDS = new Set(["view", "guest_view", "download", "zip", "slideshow"]);

// Zapisuje zdarzenie do statystyk galerii (otwarcie, pobranie, ZIP, pokaz slajdów)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = adminClient();
  if (!db || !isValidGalleryId(id)) return new NextResponse(null, { status: 204 });

  const body = (await req.json().catch(() => null)) as { kind?: string; photo?: string } | null;
  const kind = String(body?.kind ?? "");
  if (!KINDS.has(kind)) return new NextResponse(null, { status: 204 });
  const photo = body?.photo ? String(body.photo).slice(0, 200) : null;

  // Błąd zapisu (np. galeria bez wiersza w bazie) nie przeszkadza klientowi
  await db.from("gallery_events").insert({ gallery_id: id, kind, photo });
  return new NextResponse(null, { status: 204 });
}
