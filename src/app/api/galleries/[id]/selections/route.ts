import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/owner";

export const runtime = "nodejs";

// Fotograf usuwa wybór klienta (zasady bezpieczeństwa w bazie pozwalają tylko na własne galerie)
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const denied = await requireOwner(id);
  if (denied) return denied;
  const body = (await req.json().catch(() => null)) as { selection?: string } | null;
  const { supabase } = await getUser();
  const { error } = await supabase.from("selections").delete().eq("id", String(body?.selection ?? "")).eq("gallery_id", id);
  if (error) return NextResponse.json({ error: "Nie udało się usunąć wyboru." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
