import Link from "next/link";
import SideLogout from "@/components/SideLogout";
import { notFound } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { isValidGalleryId, galleryPrefix } from "@/lib/r2";
import { getGalleryPhotos, getGalleryUsage, pickCover, applyOrder, listKeys, type Photo } from "@/lib/photos";
import { getMeta, watermarkOn, draftDeleteDate } from "@/lib/galleries";
import ShareBar from "./ShareBar";
import PublishBar from "./PublishBar";
import PaymentNotice from "./PaymentNotice";
import { getBilling } from "@/lib/billing";
import { getWallet } from "@/lib/wallet";
import { getDomainByUser, domainActive, vercelDomainStatus, saveDomain } from "@/lib/domains";
import { getLang } from "@/lib/lang-server";
import { tr, locale } from "@/lib/lang";
import PlanBar from "./PlanBar";
import PhotoManager from "./PhotoManager";
import SettingsForm from "./SettingsForm";
import ProtectionCard from "./ProtectionCard";
import GuestCard from "./GuestCard";
import SelectionsTab from "./SelectionsTab";
import StatsTab from "./StatsTab";
import WmAutoFix from "./WmAutoFix";
import SaleCard from "./SaleCard";
import VideoManager from "./VideoManager";
import { refreshVideos, videoPrice } from "@/lib/videos";
import { PERIODS } from "@/lib/plans";
import { saveMeta } from "@/lib/galleries";
import PickLimitCard from "./PickLimitCard";
import ClientExtendCard from "./ClientExtendCard";
import ThemeCard from "./ThemeCard";
import FacesCard from "./FacesCard";
import { FACES_PRICE } from "@/lib/faces";
import { THEMES, getOwnedThemes } from "@/lib/themes";
import { getPayout } from "@/lib/sales";
import AlbumTab from "./AlbumTab";
import { getAlbumProject, getAlbumSub, albumActive, albumAllowed, freeAlbumFor } from "@/lib/albums";
import { isAdminEmail } from "@/lib/supabase/admin";
import ProGalleryBar from "./ProGalleryBar";
import YouTubeCard from "./YouTubeCard";
import { ytAllowed } from "@/lib/youtube";
import { getProSub, proActive, proTier, proName, proBytes, proUsage } from "@/lib/pro";
import type { PlanId } from "@/lib/plans";

export const dynamic = "force-dynamic";


export default async function ZarzadzanieGalerii({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; platnosc?: string }>;
}) {
  const { id } = await params;
  const { tab = "zdjecia", platnosc } = await searchParams;
  const lang = await getLang();
  const L = (pl: string, en: string) => tr(lang, pl, en);
  const dateFmt = new Intl.DateTimeFormat(locale(lang), { day: "numeric", month: "long", year: "numeric" });
  if (!isValidGalleryId(id)) notFound();

  const { supabase, user } = await getUser();
  const billing = user ? await getBilling(user.id) : null;
  const balance = user ? (await getWallet(user.id)).balance : 0;
  const domainRec = user ? await getDomainByUser(user.id).catch(() => null) : null;
  // Własna domena w linkach dopiero, gdy DNS już działa – inaczej klient dostałby niedziałający link
  let domain = domainActive(domainRec) && domainRec!.verified ? domainRec!.host : null;
  if (domainActive(domainRec) && !domainRec!.verified) {
    const st = await vercelDomainStatus(domainRec!.host).catch(() => null);
    if (st?.configured) {
      await saveDomain({ ...domainRec!, verified: true }).catch(() => undefined);
      domain = domainRec!.host;
    }
  }
  // Abonament Pro: galerie bez opłat, wspólna pula miejsca, dodatki w cenie
  const proSub = user ? await getProSub(user.id).catch(() => null) : null;
  const proOn = proActive(proSub);
  const proT = proSub ? proTier(proSub.tier) : undefined;
  const ownedThemes = proOn ? THEMES.map((th) => th.id) : user ? await getOwnedThemes(user.id).catch(() => []) : [];
  const hasPayout = user ? Boolean(await getPayout(user.id).catch(() => null)) : false;
  const { data } = await supabase.from("galleries").select("id, title, created_at").eq("id", id).maybeSingle();
  if (!data) notFound();
  const gallery = data as { id: string; title: string; created_at: string };

  const [meta, rawPhotos, usedBytes] = await Promise.all([
    getMeta(id).catch(() => null),
    getGalleryPhotos(id).catch(() => [] as Photo[]),
    getGalleryUsage(id).catch(() => 0),
  ]);
  const photos = applyOrder(rawPhotos, meta?.order);
  // Stan przygotowania podglądu filmów (Cloudflare Stream)
  if (meta?.videos?.length && (await refreshVideos(meta.videos).catch(() => false))) await saveMeta(id, meta).catch(() => undefined);

  // Zdjęcia, na które znak wodny nie został jeszcze nałożony
  let wmMissing: string[] = [];
  if (watermarkOn(meta)) {
    const wm = new Set(await listKeys(`${galleryPrefix(id)}wm/`).catch(() => [] as string[]));
    wmMissing = photos.filter((p) => !wm.has(`${galleryPrefix(id)}wm/${p.name}.jpg`)).map((p) => p.name);
  }

  const pool = proT && user && (proOn || meta?.plan === "pro") ? await proUsage(user.id).catch(() => null) : null;
  const metaExpired = Boolean(meta?.expiresAt && new Date(meta.expiresAt).getTime() < Date.now());

  const cover = pickCover(photos, meta?.cover);
  // Dopłata za filmy przy przedłużeniu – ta sama, którą liczy serwer przy płatności
  const paidVideos = (meta?.videos ?? []).filter((v) => v.status === "processing" || v.status === "ready");
  const videoExtend = paidVideos.length
    ? Object.fromEntries(PERIODS.map((p) => [p, paidVideos.reduce((s, v) => s + videoPrice(v.size, v.duration, p, false), 0)]))
    : null;

  const { count: selectionCount } = await supabase
    .from("selections")
    .select("id", { count: "exact", head: true })
    .eq("gallery_id", id);

  const tabs = [
    { key: "zdjecia", label: L("Zdjęcia", "Photos"), count: photos.length },
    { key: "wybory", label: meta?.sale?.enabled ? L("Zamówienia klientów", "Client orders") : L("Wybory klientów", "Client selections"), count: selectionCount ?? 0 },
    ...(albumAllowed(user?.email) ? [{ key: "album", label: L("Album", "Album"), count: null }] : []),
    { key: "statystyki", label: L("Statystyki", "Statistics"), count: null },
    { key: "ustawienia", label: L("Ustawienia", "Settings"), count: null },
  ];

  return (
    <div className="app-body">
      <aside className="app-side g-side">
        <Link href="/panel" className="link-quiet back-link">← {L("Wszystkie galerie", "All galleries")}</Link>
        <div className="g-side-head">
          <p className="g-side-kicker">{L("Galeria", "Gallery")}</p>
          <h1 className="g-side-title">{gallery.title}</h1>
          <p className="g-side-meta">{L("Utworzona", "Created")} {dateFmt.format(new Date(gallery.created_at))}</p>
        </div>
        <div className="g-side-cover">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover.webUrl} alt="" />
          ) : (
            <span>{L("Okładką zostanie pierwsze zdjęcie. Zmienisz ją gwiazdką przy zdjęciu.", "The first photo will be the cover. Change it with the star on any photo.")}</span>
          )}
        </div>
        <nav aria-label={L("Sekcje galerii", "Gallery sections")}>
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={`/panel/galeria/${id}?tab=${t.key}`}
              className={tab === t.key ? "side-link active" : "side-link"}
              aria-current={tab === t.key ? "page" : undefined}
            >
              <span>{t.label}</span>
              {t.count !== null && <span className="side-count">{t.count}</span>}
            </Link>
          ))}
        </nav>
        <SideLogout />
      </aside>

      <main className="app-main">
        {platnosc && <PaymentNotice sessionId={platnosc} galleryId={id} />}
        {tab !== "ustawienia" && wmMissing.length > 0 && meta?.watermark?.text && <WmAutoFix id={id} names={wmMissing} text={meta.watermark.text} />}
        {meta?.plan ? (
          <>
            <ShareBar
              id={id}
              title={gallery.title}
              protectedByPassword={Boolean(meta?.passwordHash)}
              password={meta?.password ?? null}
              photoCount={photos.length}
              domain={domain}
              galleryLang={meta?.lang ?? "pl"}
            />
            {meta.plan === "pro" ? (
              <ProGalleryBar
                id={id}
                mode="pro"
                name={proT ? proName(proT) : "Pro"}
                usedBytes={pool?.bytes ?? usedBytes}
                limitBytes={proT ? proBytes(proT) : 0}
                active={proOn}
                paidUntil={proSub?.paidUntil ?? null}
                expiresAt={meta.expiresAt ?? null}
              />
            ) : (
              <>
                <PlanBar
                  id={id}
                  planId={meta.plan as PlanId}
                  period={meta?.period ?? null}
                  expiresAt={meta?.expiresAt ?? null}
                  usedBytes={usedBytes}
                  billing={billing ?? { want: false, company: "", nip: "", street: "", postcode: "", city: "" }}
                  balance={balance}
                  videoExtend={videoExtend}
                />
                {proOn && proT && (
                  <ProGalleryBar
                    id={id}
                    mode="move"
                    name={proName(proT)}
                    usedBytes={pool?.bytes ?? 0}
                    limitBytes={proBytes(proT)}
                    active
                    paidUntil={proSub!.paidUntil}
                    expiresAt={meta.expiresAt ?? null}
                  />
                )}
              </>
            )}
          </>
        ) : (
          <PublishBar
            id={id}
            title={gallery.title}
            photoCount={photos.length}
            usedBytes={usedBytes}
            deleteOn={meta ? draftDeleteDate(meta).toISOString() : null}
            billing={billing ?? { want: false, company: "", nip: "", street: "", postcode: "", city: "" }}
              balance={balance}
            pro={proOn && proT ? { name: proName(proT), usedBytes: pool?.bytes ?? usedBytes, limitBytes: proBytes(proT) } : null}
          />
        )}

        {tab === "wybory" ? (
          <SelectionsTab id={id} selling={Boolean(meta?.sale?.enabled)} photos={photos.map((p) => ({ name: p.name, fileName: p.fileName, url: p.webUrl }))} />
        ) : tab === "album" && albumAllowed(user?.email) ? (
          await (async () => {
            const [project, sub, sels] = await Promise.all([
              getAlbumProject(id).catch(() => null),
              user ? getAlbumSub(user.id).catch(() => ({})) : Promise.resolve({}),
              supabase.from("selections").select("id, client_name, photos, updated_at").eq("gallery_id", id).order("updated_at", { ascending: false }),
            ]);
            const selections = ((sels.data ?? []) as { id: string; client_name: string | null; photos: string[] | null }[])
              .filter((s) => (s.photos ?? []).length > 0)
              .map((s) => ({ id: s.id, name: s.client_name ?? "", photos: s.photos ?? [] }));
            const ev = meta?.eventDate ? new Date(`${meta.eventDate}T00:00:00Z`) : null;
            const subtitle = ev ? new Intl.DateTimeFormat(locale(lang), { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(ev) : "";
            const paidUntil = (sub as { paidUntil?: string }).paidUntil ?? null;
            return (
              <AlbumTab
                id={id}
                galleryTitle={gallery.title}
                subtitle={subtitle}
                photos={photos.map((p) => ({ name: p.name, url: p.webUrl }))}
                selections={selections}
                initial={project}
                active={isAdminEmail(user?.email) || proOn || albumActive(sub) || freeAlbumFor(sub, id)}
                freeTrial={!isAdminEmail(user?.email) && !proOn && !albumActive(sub) && freeAlbumFor(sub, id)}
                paidUntil={proOn ? proSub!.paidUntil : albumActive(sub) ? paidUntil : null}
                balance={balance}
                billing={billing ?? { want: false, company: "", nip: "", street: "", postcode: "", city: "" }}
              />
            );
          })()
        ) : tab === "statystyki" ? (
          <StatsTab id={id} />
        ) : tab === "ustawienia" ? (
          <SettingsForm
            id={id}
            title={gallery.title}
            hasPassword={Boolean(meta?.passwordHash)}
            layout={meta?.layout ?? "mozaika"}
            eventDate={meta?.eventDate ?? ""}
            welcome={meta?.welcome ?? ""}
            hasMusic={Boolean(meta?.music)}
            lang={meta?.lang ?? "pl"}
          >
            <ThemeCard
              id={id}
              themes={THEMES}
              current={meta?.theme ?? "classic"}
              owned={ownedThemes}
              balance={balance}
              billing={billing ?? { want: false, company: "", nip: "", street: "", postcode: "", city: "" }}
            />
            <ProtectionCard
              id={id}
              downloads={meta?.downloads ?? "all"}
              watermark={meta?.watermark ?? { enabled: false, text: "" }}
              wmMissing={wmMissing}
              photoCount={photos.length}
            />
            <FacesCard
              id={id}
              faces={meta?.faces ?? null}
              photos={photos.map((p) => ({ name: p.name, url: p.webUrl }))}
              price={proOn ? 0 : FACES_PRICE}
              balance={balance}
              billing={billing ?? { want: false, company: "", nip: "", street: "", postcode: "", city: "" }}
            />
            <SaleCard id={id} sale={meta?.sale ?? null} watermark={watermarkOn(meta)} hasPayout={hasPayout} />
            <PickLimitCard id={id} limit={meta?.pickLimit ?? null} selling={Boolean(meta?.sale?.enabled)} />
            {ytAllowed(user?.email) && (
              <YouTubeCard id={id} enabled={Boolean(meta?.youtube?.enabled)} links={(meta?.youtube?.links ?? []).map((l) => l.url)} />
            )}
            {meta?.plan !== "pro" && <ClientExtendCard id={id} on={meta?.clientExtend !== false} />}
            <GuestCard id={id} guest={meta?.guest ?? null} sections={meta?.sections ?? []} />
          </SettingsForm>
        ) : (
          <>
          <VideoManager
            id={id}
            videos={(meta?.videos ?? []).map((v) => ({ id: v.id, name: v.name, size: v.size, duration: v.duration, status: v.status, price: v.price, months: v.months, thumbnail: v.thumbnail }))}
            published={Boolean(meta?.plan) && !metaExpired}
            pro={meta?.plan === "pro"}
            balance={balance}
            billing={billing ?? { want: false, company: "", nip: "", street: "", postcode: "", city: "" }}
          />
          <PhotoManager
            id={id}
            layout={meta?.layout ?? "mozaika"}
            cover={cover?.name ?? null}
            sections={meta?.sections ?? []}
            photos={photos.map((p) => ({
              section: meta?.photoSection?.[p.name] ?? null,
              name: p.name,
              fileName: p.fileName,
              url: p.webUrl,
              size: p.size,
              uploadedAt: p.uploadedAt,
            }))}
          />
          </>
        )}
      </main>
    </div>
  );
}
