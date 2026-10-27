import Link from "next/link";
import { notFound } from "next/navigation";
import SideLogout from "@/components/SideLogout";
import { getUser } from "@/lib/supabase/server";
import { getLang } from "@/lib/lang-server";
import { tr } from "@/lib/lang";
import { siteUrl } from "@/lib/email";
import { getBilling } from "@/lib/billing";
import { getWallet } from "@/lib/wallet";
import { getOrder } from "@/lib/p24";
import { getGuestEvent, getGuestPhotos, getGuestVideos, guestActive, guestUsage, guestCoverUrl, GUEST_PRICE, GUEST_LIMIT_GB, GUEST_DELETE_AFTER } from "@/lib/guest-events";
import RefreshSoon from "../../galeria/[id]/RefreshSoon";
import GuestEditor from "./GuestEditor";

export const dynamic = "force-dynamic";

export default async function Wydarzenie({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ platnosc?: string }> }) {
  const { id } = await params;
  const { platnosc } = await searchParams;
  const { user } = await getUser();
  const e = await getGuestEvent(id);
  if (!e || e.uid !== user!.id) notFound();
  const lang = await getLang();
  const t = (pl: string, en: string) => tr(lang, pl, en);
  const [photos, used, billing, wallet, order, videos] = await Promise.all([
    getGuestPhotos(e.id).catch(() => []),
    guestUsage(e.id).catch(() => 0),
    getBilling(user!.id),
    getWallet(user!.id),
    platnosc ? getOrder(platnosc) : Promise.resolve(null),
    getGuestVideos(e.id).catch(() => []),
  ]);
  const active = guestActive(e);
  const cover = await guestCoverUrl(e);
  const deleteOn = e.expiresAt ? new Date(new Date(e.expiresAt).getTime() + GUEST_DELETE_AFTER * 24 * 3600 * 1000).toISOString() : null;

  return (
    <div className="app-body">
      <aside className="app-side">
        <Link href="/panel/goscie" className="link-quiet back-link">← {t("Wszystkie wydarzenia", "All events")}</Link>
        <div className="g-side-head">
          <p className="g-side-kicker">{t("Zdjęcia od gości", "Guest uploads")}</p>
          <h1 className="g-side-title">{e.title}</h1>
        </div>
        <SideLogout />
      </aside>
      <main className="app-main">
        {order && order.ownerId === user!.id && order.status !== "paid" && !active && (
          <p className="warn-inline pay-note">
            {t("Czekamy na potwierdzenie płatności od Przelewy24. Strona odświeży się sama.", "Waiting for payment confirmation from Przelewy24. The page refreshes by itself.")}
            <RefreshSoon />
          </p>
        )}
        <GuestEditor
          event={{ id: e.id, title: e.title, date: e.date, welcome: e.welcome, lang: e.lang, showWall: e.showWall, allowDownload: e.allowDownload }}
          status={active ? "active" : e.status === "draft" ? "draft" : "expired"}
          expiresAt={e.expiresAt ?? null}
          deleteOn={deleteOn}
          publicUrl={`${siteUrl()}/goscie/${e.id}`}
          cover={cover}
          price={GUEST_PRICE}
          limitGb={GUEST_LIMIT_GB}
          used={used}
          balance={wallet.balance}
          billing={billing}
          videos={videos.map((v) => ({ name: v.name, poster: v.poster, src: v.src, downloadUrl: v.downloadUrl, size: v.size, processing: v.processing }))}
          photos={photos.map((p) => ({ name: p.name, url: p.webUrl, downloadUrl: p.downloadUrl, webDownloadUrl: p.webDownloadUrl, fileName: p.fileName, webFileName: p.webFileName }))}
        />
      </main>
    </div>
  );
}
