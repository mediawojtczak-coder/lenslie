import { lrUser, lrError, ownsGallery } from "@/lib/lr";
import { adminClient } from "@/lib/supabase/admin";
import { getMeta, saveMeta } from "@/lib/galleries";

export const runtime = "nodejs";

// Zmiana nazwy kolekcji w Lightroomie = zmiana nazwy galerii
export async function POST(req: Request) {
  const user = await lrUser(req);
  if (!user) return lrError("pl", "Zaloguj się ponownie we wtyczce.", "Sign in again in the plugin.", 401);
  const body = (await req.json().catch(() => null)) as { id?: string; title?: string } | null;
  const id = String(body?.id ?? "");
  const title = String(body?.title ?? "").trim().slice(0, 120);
  if (!title || !(await ownsGallery(user.uid, id))) return lrError(user.lang, "Nie znaleziono galerii.", "Gallery not found.", 404);
  await adminClient()!.from("galleries").update({ title }).eq("id", id);
  const meta = await getMeta(id);
  if (meta) await saveMeta(id, { ...meta, title });
  return Response.json({ ok: true });
}
