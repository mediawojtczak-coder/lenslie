import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, BUCKET } from "@/lib/r2";
import { adminClient } from "@/lib/supabase/admin";

export type Brand = { studioName: string | null; logoUrl: string | null };

export async function logoUrl(key: string | null | undefined) {
  if (!key) return null;
  return getSignedUrl(r2, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: 7200 }).catch(() => null);
}

// Nazwa studia, logo, e-mail i język fotografa – po identyfikatorze konta (np. dla strony rezerwacji)
export async function getUserBrand(uid: string): Promise<Brand & { email: string | null }> {
  const db = adminClient();
  if (!db) return { studioName: null, logoUrl: null, email: null };
  const [{ data: p }, { data: u }] = await Promise.all([
    db.from("profiles").select("studio_name, logo_key").eq("id", uid).maybeSingle(),
    db.auth.admin.getUserById(uid),
  ]);
  return { studioName: p?.studio_name ?? null, logoUrl: await logoUrl(p?.logo_key), email: u?.user?.email ?? null };
}

// Nazwa studia i logo fotografa, do którego należy galeria (widoczne dla klienta)
export async function getGalleryBrand(galleryId: string): Promise<Brand> {
  const db = adminClient();
  if (!db) return { studioName: null, logoUrl: null };
  const { data: g } = await db.from("galleries").select("owner_id").eq("id", galleryId).maybeSingle();
  if (!g?.owner_id) return { studioName: null, logoUrl: null };
  const { data: p } = await db.from("profiles").select("studio_name, logo_key").eq("id", g.owner_id).maybeSingle();
  return { studioName: p?.studio_name ?? null, logoUrl: await logoUrl(p?.logo_key) };
}

// E-mail właściciela galerii (do powiadomień)
// E-mail i język fotografa – do maili w jego języku
export async function getOwnerContact(galleryId: string): Promise<{ email: string; lang: "pl" | "en" } | null> {
  const db = adminClient();
  if (!db) return null;
  const { data: g } = await db.from("galleries").select("owner_id").eq("id", galleryId).maybeSingle();
  if (!g?.owner_id) return null;
  const { data } = await db.auth.admin.getUserById(g.owner_id);
  if (!data?.user?.email) return null;
  const { getUserLang } = await import("@/lib/lang-server");
  return { email: data.user.email, lang: await getUserLang(g.owner_id) };
}

export async function getOwnerEmail(galleryId: string): Promise<string | null> {
  const db = adminClient();
  if (!db) return null;
  const { data: g } = await db.from("galleries").select("owner_id").eq("id", galleryId).maybeSingle();
  if (!g?.owner_id) return null;
  const { data } = await db.auth.admin.getUserById(g.owner_id);
  return data?.user?.email ?? null;
}
