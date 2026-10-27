import { NextResponse } from "next/server";
import { E } from "@/lib/api-lang";
import { isValidGalleryId } from "@/lib/r2";
import { getUser } from "@/lib/supabase/server";

// Sprawdza, czy zalogowany fotograf jest właścicielem galerii. Zwraca odpowiedź z błędem albo null.
export async function requireOwner(id: string): Promise<NextResponse | null> {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: await E("Zaloguj się ponownie.") }, { status: 401 });
  if (!isValidGalleryId(id)) return NextResponse.json({ error: await E("Nieprawidłowa galeria.") }, { status: 400 });
  const { data: own } = await supabase.from("galleries").select("id").eq("id", id).maybeSingle();
  if (!own) return NextResponse.json({ error: await E("To nie jest Twoja galeria.") }, { status: 403 });
  return null;
}
