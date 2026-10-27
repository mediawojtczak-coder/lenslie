import { getEvent, icsFor } from "@/lib/bookings";
import { getUserBrand } from "@/lib/profiles";

export const runtime = "nodejs";

// Plik kalendarza (.ics) dla wybranego terminu
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = await getEvent(id);
  const slot = e?.slots.find((s) => s.id === new URL(req.url).searchParams.get("slot"));
  if (!e || !slot) return new Response("Not found", { status: 404 });
  const brand = await getUserBrand(e.uid).catch(() => null);
  return new Response(icsFor(e, slot, brand?.studioName ?? null), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${e.id}.ics"`,
    },
  });
}
