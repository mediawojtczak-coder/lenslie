import { NextResponse } from "next/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { r2, BUCKET, isValidGalleryId, galleryPrefix } from "@/lib/r2";
import { listKeys } from "@/lib/photos";
import { getUser } from "@/lib/supabase/server";
import { adminClient, isAdminEmail } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Usuwa z magazynu pliki galerii, której nie ma w bazie (pozostałości po testach)
export async function POST(req: Request) {
  const { user } = await getUser();
  if (!user || !isAdminEmail(user.email)) return NextResponse.json({ error: "Brak dostępu." }, { status: 403 });
  const db = adminClient();
  const form = await req.formData().catch(() => null);
  const id = String(form?.get("id") ?? "");
  const back = (msg: string) => NextResponse.redirect(new URL(`/admin?usuniete=${encodeURIComponent(msg)}`, req.url), 303);
  if (!db || !isValidGalleryId(id)) return back("Nieprawidłowa galeria.");

  // Bezpiecznik: nigdy nie usuwamy galerii, która istnieje w bazie
  const { data } = await db.from("galleries").select("id").eq("id", id).maybeSingle();
  if (data) return back(`Galeria ${id} istnieje w bazie – nie usunięto.`);

  const keys = await listKeys(galleryPrefix(id));
  for (let i = 0; i < keys.length; i += 10) {
    await Promise.all(keys.slice(i, i + 10).map((Key) => r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key }))));
  }
  return back(`Usunięto ${id} (${keys.length} plików).`);
}
