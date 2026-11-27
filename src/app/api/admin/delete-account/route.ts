import { NextResponse } from "next/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { r2, BUCKET, galleryPrefix } from "@/lib/r2";
import { listKeys } from "@/lib/photos";
import { getUser } from "@/lib/supabase/server";
import { adminClient, isAdminEmail } from "@/lib/supabase/admin";
import { getMeta } from "@/lib/galleries";
import { deleteGalleryVideos } from "@/lib/videos";
import { listUserGuestEvents, deleteGuestEvent } from "@/lib/guest-events";

export const runtime = "nodejs";
export const maxDuration = 300;

async function deleteKeys(keys: string[]) {
  for (let i = 0; i < keys.length; i += 20) {
    await Promise.all(keys.slice(i, i + 20).map((Key) => r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key })).catch(() => undefined)));
  }
}

// Administrator: usuwa konto fotografa ze wszystkim – galerie (zdjęcia, filmy), strony gości, portfolio,
// dane w R2 (profil, saldo, Pro itd.) i samo konto (wpisy w bazie usuwają się kaskadowo).
export async function POST(req: Request) {
  const { user } = await getUser();
  if (!user || !isAdminEmail(user.email)) return NextResponse.json({ error: "Brak dostępu." }, { status: 403 });
  const form = await req.formData().catch(() => null);
  const uid = String(form?.get("uid") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(uid) || uid === user.id) return NextResponse.json({ error: "Nieprawidłowe konto." }, { status: 400 });

  const db = adminClient();
  if (!db) return NextResponse.json({ error: "Brak połączenia z bazą." }, { status: 500 });
  const { data: target } = await db.auth.admin.getUserById(uid);
  if (!target?.user) return NextResponse.redirect(new URL(`/admin?usuniete=${encodeURIComponent("To konto już nie istnieje.")}#fotografowie`, req.url), 303);
  if (isAdminEmail(target.user.email)) return NextResponse.json({ error: "Nie można usunąć konta administratora." }, { status: 400 });

  // 1. Galerie: filmy (Stream) i wszystkie pliki
  const { data: gals } = await db.from("galleries").select("id").eq("owner_id", uid);
  for (const g of gals ?? []) {
    const meta = await getMeta(g.id).catch(() => null);
    await deleteGalleryVideos(g.id, meta?.videos ?? []).catch(() => undefined);
    await deleteKeys(await listKeys(galleryPrefix(g.id)).catch(() => []));
  }
  // 2. Strony „zdjęcia od gości”
  for (const e of await listUserGuestEvents(uid).catch(() => [])) await deleteGuestEvent(e).catch(() => undefined);
  // 3. Dane konta w R2
  const prefixed = (await Promise.all([`profiles/${uid}/`, `portfolio/${uid}/`].map((p) => listKeys(p).catch(() => [] as string[])))).flat();
  await deleteKeys([
    ...prefixed,
    `guests-users/${uid}.json`,
    `onboarding/${uid}.json`,
    `pro/${uid}.json`,
    `pro-usage/${uid}.json`,
    `signup-sources/${uid}.json`,
  ]);
  // 4. Konto (galerie, wybory, profil w bazie – kaskadowo)
  await db.from("galleries").delete().eq("owner_id", uid);
  const { error } = await db.auth.admin.deleteUser(uid);
  if (error) return NextResponse.json({ error: `Pliki usunięte, ale konta nie udało się usunąć: ${error.message}` }, { status: 500 });
  return NextResponse.redirect(new URL(`/admin?usuniete=${encodeURIComponent(`Usunięto konto ${target.user.email ?? ""} razem z galeriami (${gals?.length ?? 0}) i wszystkimi plikami.`)}#fotografowie`, req.url), 303);
}
