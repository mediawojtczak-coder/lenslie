import Link from "next/link";
import { getGalleryPhotos, pickCover, applyOrder, getMusicUrl, type Photo } from "@/lib/photos";
import { watermarkOn, type GalleryMeta, type Downloads } from "@/lib/galleries";
import { getGalleryBrand } from "@/lib/profiles";
import { adminClient } from "@/lib/supabase/admin";
import { getSelection, selectionCookie } from "@/lib/selections";
import { cookies } from "next/headers";
import DownloadAll from "./DownloadAll";
import Hero from "./Hero";
import PhotoGrid, { type Group, type GridItem } from "./PhotoGrid";
import SlideshowButton from "./SlideshowButton";
import Track from "./Track";
import { T } from "@/lib/i18n";
import { Great_Vibes } from "next/font/google";
import { isThemeId, type ThemeId } from "@/lib/themes";

// Odręczne pismo dla motywu rustykalnego
const scriptFont = Great_Vibes({ weight: "400", subsets: ["latin", "latin-ext"], variable: "--font-script", display: "swap", preload: false });
import { saleOn, getSaleOrder, getPayoutForGallery, type SaleOrder } from "@/lib/sales";
import type { SaleInfo } from "./PhotoGrid";
import VideoSection, { type ClientVideo } from "./VideoSection";
import FaceSearch from "./FaceSearch";
import ExtendAccess from "./ExtendAccess";
import { clientExtendOffer } from "@/lib/client-extend";
import { refreshVideos, signedVideoUrl, iframeUrl } from "@/lib/videos";
import { saveMeta } from "@/lib/galleries";

const dateFmt = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export function formatEventDate(d?: string, lang: "pl" | "en" = "pl") {
  if (!d) return undefined;
  const fmt = lang === "en" ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : dateFmt;
  return fmt.format(new Date(`${d}T00:00:00Z`));
}


const rank: Record<Downloads, number> = { none: 0, web: 1, all: 2 };

// Galeria widziana przez klienta albo przez gości (osobny link)
export default async function GalleryView({
  id,
  meta,
  title,
  mode,
  preview = false,
  themeOverride,
}: {
  // Podgląd motywu przez fotografa (?motyw=…)
  themeOverride?: ThemeId;
  id: string;
  meta: GalleryMeta | null;
  title: string;
  mode: "client" | "guest";
  // Fotograf ogląda wersję roboczą przed publikacją
  preview?: boolean;
}) {
  const lang = meta?.lang ?? "pl";
  const t = T[lang];
  const theme: ThemeId = themeOverride ?? (isThemeId(meta?.theme) ? meta!.theme! : "classic");
  const watermark = watermarkOn(meta) ? meta!.watermark!.text : null;

  const brand = await getGalleryBrand(id).catch(() => ({ studioName: null, logoUrl: null }));

  let error = false;
  let photos: Photo[] = [];
  try {
    photos = applyOrder(await getGalleryPhotos(id, { watermark: Boolean(watermark) }), meta?.order);
  } catch {
    error = true;
  }

  // Sprzedaż zdjęć: klient pobiera tylko zdjęcia z dostarczonego zamówienia
  const selling = saleOn(meta);
  const store = await cookies();
  const sel =
    mode === "client" && !preview && adminClient()
      ? await getSelection(id, store.get(selectionCookie(id))?.value).catch(() => null)
      : null;
  const order: SaleOrder | null = selling && sel ? await getSaleOrder(id, sel.id).catch(() => null) : null;
  const unlocked = new Set(order?.status === "delivered" ? order.photos : []);
  const clean = new Map<string, Photo>();
  if (unlocked.size > 0) {
    for (const p of await getGalleryPhotos(id).catch(() => [] as Photo[])) if (unlocked.has(p.name)) clean.set(p.name, p);
  }

  // Goście nigdy nie dostają więcej niż klient
  const clientDownloads: Downloads = selling ? "none" : (meta?.downloads ?? "all");
  const guest = meta?.guest;
  const downloads: Downloads =
    mode === "guest" && guest
      ? rank[guest.downloads] < rank[clientDownloads]
        ? guest.downloads
        : clientDownloads
      : clientDownloads;

  const toItem = (p: Photo): GridItem => {
    const c = clean.get(p.name);
    if (c) {
      return {
        name: p.name,
        fileName: c.fileName,
        webUrl: c.webUrl,
        downloadUrl: c.downloadUrl,
        webDownloadUrl: c.webDownloadUrl,
        webFileName: c.webFileName,
        unlocked: true,
      };
    }
    return toLocked(p);
  };
  const toLocked = (p: Photo): GridItem => ({
    name: p.name,
    fileName: p.fileName,
    webUrl: p.webUrl,
    downloadUrl: downloads === "all" ? p.downloadUrl : undefined,
    webDownloadUrl: downloads !== "none" ? p.webDownloadUrl : undefined,
    webFileName: p.webFileName,
    wmPending: Boolean(watermark) && p.watermarked === false,
  });

  // Sekcje w kolejności ustawionej przez fotografa; goście widzą tylko wybrane sekcje
  const sections = meta?.sections ?? [];
  const assigned = meta?.photoSection ?? {};
  const known = new Set(sections.map((x) => x.id));
  const guestOnly = mode === "guest" && guest && guest.sections.length > 0 ? new Set(guest.sections) : null;
  let groups: Group[] = [
    ...sections.map((sec) => ({
      id: sec.id,
      name: sec.name,
      photos: photos.filter((p) => assigned[p.name] === sec.id).map(toItem),
    })),
    {
      id: "pozostale",
      name: null,
      photos: photos.filter((p) => !known.has(assigned[p.name] ?? "")).map(toItem),
    },
  ];
  if (guestOnly) groups = groups.filter((g) => guestOnly.has(g.id));
  const visible = groups.flatMap((g) => g.photos);
  const visibleNames = new Set(visible.map((p) => p.name));
  const shown = photos.filter((p) => visibleNames.has(p.name));

  const subtitle =
    [formatEventDate(meta?.eventDate, lang), shown.length > 0 ? t.photos(shown.length) : null].filter(Boolean).join(" · ") ||
    undefined;
  // Filmy: gotowe (opłacone) – na samej górze galerii
  if (meta?.videos?.some((v) => v.status === "processing") && (await refreshVideos(meta.videos).catch(() => false))) {
    await saveMeta(id, meta).catch(() => undefined);
  }
  const videoDownload = mode === "client" && !selling && clientDownloads === "all" && !preview;
  const clientVideos: ClientVideo[] = await Promise.all(
    (meta?.videos ?? [])
      .filter((v) => v.status === "ready" || (preview && v.status === "processing"))
      .map(async (v) => ({
        id: v.id,
        name: v.name,
        iframe: iframeUrl(v.preview),
        src: v.preview ? "" : await signedVideoUrl(v.key),
        poster: v.thumbnail,
        size: v.size,
        download: videoDownload ? await signedVideoUrl(v.key, v.name) : undefined,
      })),
  );
  const musicUrl = meta?.music ? await getMusicUrl(id).catch(() => null) : null;
  const cover = pickCover(shown, meta?.cover) ?? pickCover(photos, meta?.cover);

  // Ulubione są dostępne dla klienta (nie dla gości), gdy działa baza wyborów
  let favorites: { name: string | null; photos: string[] } | null = null;
  if (mode === "client" && !preview && adminClient()) {
    favorites = { name: sel?.client_name ?? null, photos: order?.photos ?? sel?.photos ?? [] };
  }

  // Galeria ze sprzedażą: pakiet, stan zamówienia i dane do wpłaty
  let sale: SaleInfo | null = null;
  if (selling && favorites) {
    sale = {
      included: meta!.sale!.included,
      extraPrice: meta!.sale!.extraPrice,
      title,
      payout: await getPayoutForGallery(id).catch(() => null),
      order: order ? { status: order.status, total: order.total, extra: order.extra, count: order.photos.length, ref: order.ref } : null,
      delivered: [...clean.values()].map((c) => ({ url: c.downloadUrl, fileName: c.fileName, webUrl: c.webDownloadUrl, webFileName: c.webFileName })),
    };
  }

  // Klient widzi, ile dni zostało, i może sam przedłużyć dostęp
  // Pasek pojawia się dopiero na 14 dni przed końcem dostępu
  const offerAll = mode === "client" && !preview ? await clientExtendOffer(id, meta).catch(() => null) : null;
  const extendOffer = offerAll && offerAll.daysLeft <= 14 ? offerAll : null;

  return (
    <div className={`gtheme gtheme-${theme} ${scriptFont.variable}`}>
      {preview && (
        <p className="preview-banner">
          Podgląd wersji roboczej. Klienci zobaczą galerię dopiero po opublikowaniu.{" "}
          <Link href={`/panel/galeria/${id}`}>Wróć do panelu</Link>
        </p>
      )}
      <Hero
        id={id}
        title={title}
        subtitle={subtitle}
        studio={brand.studioName}
        coverUrl={cover?.webUrl ?? null}
        locked={false}
        error={false}
        lang={lang}
      />

      <div className="g-bar" id="zdjecia">
        {brand.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={brand.logoUrl} alt={brand.studioName ?? "Logo fotografa"} className="g-bar-logo" />
        ) : brand.studioName ? (
          <p className="wordmark g-bar-mark g-bar-studio">{brand.studioName}</p>
        ) : (
          <Link href="/" className="wordmark g-bar-mark">
            Lenslie
          </Link>
        )}
        <p className="g-bar-title">{title}</p>
        <div className="g-bar-actions">
          {!preview && meta?.faces?.enabled && meta.faces.paid && (meta.faces.indexed ?? 0) > 0 && visible.length > 0 && (
            <FaceSearch galleryId={id} guestToken={mode === "guest" ? meta.guest?.token : undefined} lang={lang} />
          )}
          {visible.length > 1 && <SlideshowButton lang={lang} />}
          {visible.length > 0 && downloads !== "none" && (
            <DownloadAll
              zipName={`${id}.zip`}
              allowFull={downloads === "all"}
              lang={lang}
              items={visible.map((p) => ({
                url: p.downloadUrl ?? "",
                fileName: p.fileName,
                webUrl: p.webDownloadUrl ?? "",
                webFileName: p.webFileName,
              }))}
            />
          )}
          {mode === "client" && meta?.passwordHash && (
            <form method="post" action={`/api/galleries/${id}/lock`}>
              <button type="submit" className="g-logout">
                {t.logout}
              </button>
            </form>
          )}
        </div>
      </div>

      <main className="g-photos">
        {clientVideos.length > 0 && <VideoSection videos={clientVideos} lang={lang} />}
        {meta?.welcome && <p className="g-welcome">{meta.welcome}</p>}
        {error && <p className="notice">{t.loadError}</p>}
        {!error && visible.length === 0 && <p className="notice">{t.empty}</p>}
        {visible.length > 0 && (
          <PhotoGrid
            layout={meta?.layout ?? "mozaika"}
            groups={groups}
            zipBase={id}
            musicUrl={musicUrl}
            downloads={downloads}
            watermark={watermark}
            galleryId={id}
            favorites={favorites}
            sale={sale}
            limit={meta?.pickLimit ?? null}
            lang={lang}
          />
        )}
      </main>
      {extendOffer && <ExtendAccess id={id} offer={extendOffer} lang={lang} />}
      {!preview && <Track galleryId={id} mode={mode} />}
      <footer className="g-footer">
        {brand.studioName && <span>{brand.studioName} · </span>}
        <a href="https://www.lenslie.com">{t.footer}</a>
      </footer>
    </div>
  );
}
