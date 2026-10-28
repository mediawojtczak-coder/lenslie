import { lrUser, lrError, ownsGallery } from "@/lib/lr";
import { deletePhotos } from "@/lib/uploads";

export const runtime = "nodejs";

// Usunięcie zdjęć z galerii, gdy fotograf usunie je z kolekcji w Lightroomie
export async function POST(req: Request) {
  const user = await lrUser(req);
  if (!user) return lrError("pl", "Zaloguj się ponownie we wtyczce.", "Sign in again in the plugin.", 401);
  const body = (await req.json().catch(() => null)) as { gallery?: string; ids?: string[] } | null;
  const gallery = String(body?.gallery ?? "");
  if (!(await ownsGallery(user.uid, gallery))) return lrError(user.lang, "Nie znaleziono galerii w Twoim koncie.", "Gallery not found in your account.", 404);
  const ids = new Set((body?.ids ?? []).map(String).filter(Boolean).slice(0, 2000));
  if (!ids.size) return Response.json({ ok: true, deleted: 0 });
  return Response.json({ ok: true, deleted: await deletePhotos(gallery, ids) });
}
