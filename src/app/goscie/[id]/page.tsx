import { notFound } from "next/navigation";
import { Great_Vibes } from "next/font/google";
import { getGuestEvent, getGuestPhotos, getGuestVideos, guestActive, guestCoverUrl, type GuestPhoto, type GuestVideo } from "@/lib/guest-events";

// Odręczne pismo do imion pary – tylko na stronie gości
const script = Great_Vibes({ weight: "400", subsets: ["latin", "latin-ext"], variable: "--font-script", display: "swap" });
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
  const cover = await guestCoverUrl(e);
  const showWall = (active || owner) && (e.showWall || owner);
  const [photos, videos]: [GuestPhoto[], GuestVideo[]] = showWall
    ? await Promise.all([getGuestPhotos(e.id).catch(() => []), getGuestVideos(e.id).catch(() => [])])
    : [[], []];

  return (
    <div className={script.variable}>
    <GuestPage
      cover={cover}
      event={{ id: e.id, title: e.title, date: e.date, welcome: e.welcome, lang: e.lang, showWall: e.showWall, allowDownload: e.allowDownload }}
      state={active ? "active" : e.status === "draft" ? "draft" : "expired"}
      owner={owner}
      studio={brand?.studioName ?? null}
      videos={videos.map((v) => ({ name: v.name, src: v.src, iframe: v.iframe, poster: v.poster, downloadUrl: v.downloadUrl, processing: v.processing }))}
      photos={photos.map((p) => ({ name: p.name, url: p.webUrl, downloadUrl: p.downloadUrl, webDownloadUrl: p.webDownloadUrl, fileName: p.fileName, webFileName: p.webFileName }))}
    />
    </div>
  );
}
