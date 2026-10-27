import { notFound } from "next/navigation";
import { getGuestEvent, getGuestPhotos, guestActive, type GuestPhoto } from "@/lib/guest-events";
import { getUserBrand } from "@/lib/profiles";
import { getUser } from "@/lib/supabase/server";
import GuestPage from "./GuestPage";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

// Galeria gości wesela: goście wgrywają zdjęcia z telefonów (link z kodu QR)
export default async function Goscie({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = await getGuestEvent(id);
  if (!e) notFound();
  const { user } = await getUser().catch(() => ({ user: null }));
  const owner = user?.id === e.uid;
  const active = guestActive(e);
  const brand = await getUserBrand(e.uid).catch(() => null);
  const photos: GuestPhoto[] = (active || owner) && (e.showWall || owner) ? await getGuestPhotos(e.id).catch(() => []) : [];

  return (
    <GuestPage
      event={{ id: e.id, title: e.title, date: e.date, welcome: e.welcome, lang: e.lang, showWall: e.showWall, allowDownload: e.allowDownload }}
      state={active ? "active" : e.status === "draft" ? "draft" : "expired"}
      owner={owner}
      studio={brand?.studioName ?? null}
      photos={photos.map((p) => ({ name: p.name, url: p.webUrl, downloadUrl: p.downloadUrl, webDownloadUrl: p.webDownloadUrl, fileName: p.fileName, webFileName: p.webFileName }))}
    />
  );
}
