import { adminClient } from "@/lib/supabase/admin";

// Wybór ulubionych zdjęć klienta. Ciasteczko przechowuje identyfikator wyboru.
export const selectionCookie = (galleryId: string) => `lsel_${galleryId}`;

export type Selection = {
  id: string;
  client_name: string;
  client_email: string | null;
  photos: string[];
  note: string | null;
  updated_at: string;
};

const UUID = /^[0-9a-f-]{36}$/i;

export async function getSelection(galleryId: string, token?: string | null): Promise<Selection | null> {
  const db = adminClient();
  if (!db || !token || !UUID.test(token)) return null;
  const { data } = await db
    .from("selections")
    .select("id, client_name, client_email, photos, note, updated_at")
    .eq("id", token)
    .eq("gallery_id", galleryId)
    .maybeSingle();
  return (data as Selection | null) ?? null;
}
