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
import { getDomainByUser, domainActive } from "@/lib/domains";
import { getLang } from "@/lib/lang-server";
import { tr, locale } from "@/lib/lang";
import PlanBar from "./PlanBar";
import PhotoManager from "./PhotoManager";
import SettingsForm from "./SettingsForm";
import ProtectionCard from "./ProtectionCard";
import GuestCard from "./GuestCard";
import SelectionsTab from "./SelectionsTab";
import StatsTab from "./StatsTab";

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
  const domain = domainActive(domainRec) ? domainRec!.host : null;
  const { data } = await supabase.from("galleries").select("id, title, created_at").eq("id", id).maybeSingle();
  if (!data) notFound();
  const gallery = data as { id: string; title: string; created_at: string };

  const [meta, rawPhotos, usedBytes] = await Promise.all([
    getMeta(id).catch(() => null),
    getGalleryPhotos(id).catch(() => [] as Photo[]),
    getGalleryUsage(id).catch(() => 0),
  ]);
  const photos = applyOrder(rawPhotos, meta?.order);

  // Zdjęcia, na które znak wodny nie został jeszcze nałożony
  let wmMissing: string[] = [];
  if (tab === "ustawienia" && watermarkOn(meta)) {
    const wm = new Set(await listKeys(`${galleryPrefix(id)}wm/`).catch(() => [] as string[]));
    wmMissing = photos.filter((p) => !wm.has(`${galleryPrefix(id)}wm/${p.name}.jpg`)).map((p) => p.name);
  }

  const cover = pickCover(photos, meta?.cover);

  const { count: selectionCount } = await supabase
    .from("selections")
    .select("id", { count: "exact", head: true })
    .eq("gallery_id", id);

  const tabs = [
    { key: "zdjecia", label: L("Zdjęcia", "Photos"), count: photos.length },
    { key: "wybory", label: L("Wybory klientów", "Client selections"), count: selectionCount ?? 0 },
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
            <PlanBar
              id={id}
              planId={meta?.plan ?? null}
              period={meta?.period ?? null}
              expiresAt={meta?.expiresAt ?? null}
              usedBytes={usedBytes}
              billing={billing ?? { want: false, company: "", nip: "", street: "", postcode: "", city: "" }}
              balance={balance}
            />
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
          />
        )}

        {tab === "wybory" ? (
          <SelectionsTab id={id} photos={photos.map((p) => ({ name: p.name, fileName: p.fileName, url: p.webUrl }))} />
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
            <ProtectionCard
              id={id}
              downloads={meta?.downloads ?? "all"}
              watermark={meta?.watermark ?? { enabled: false, text: "" }}
              wmMissing={wmMissing}
              photoCount={photos.length}
            />
            <GuestCard id={id} guest={meta?.guest ?? null} sections={meta?.sections ?? []} />
          </SettingsForm>
        ) : (
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
        )}
      </main>
    </div>
  );
}
