import Link from "next/link";
import SideLogout from "@/components/SideLogout";
import { notFound } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { isValidGalleryId } from "@/lib/r2";
import { getGalleryPhotos, getGalleryUsage, pickCover, type Photo } from "@/lib/photos";
import { getMeta } from "@/lib/galleries";
import ShareBar from "./ShareBar";
import PlanBar from "./PlanBar";
import PhotoManager from "./PhotoManager";
import SettingsForm from "./SettingsForm";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric" });

export default async function ZarzadzanieGalerii({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab = "zdjecia" } = await searchParams;
  if (!isValidGalleryId(id)) notFound();

  const { supabase } = await getUser();
  const { data } = await supabase.from("galleries").select("id, title, created_at").eq("id", id).maybeSingle();
  if (!data) notFound();
  const gallery = data as { id: string; title: string; created_at: string };

  const [meta, photos, usedBytes] = await Promise.all([
    getMeta(id).catch(() => null),
    getGalleryPhotos(id).catch(() => [] as Photo[]),
    getGalleryUsage(id).catch(() => 0),
  ]);

  const cover = pickCover(photos, meta?.cover);

  const tabs = [
    { key: "zdjecia", label: "Zdjęcia" },
    { key: "ustawienia", label: "Ustawienia" },
  ];

  return (
    <div className="app-body">
      <aside className="app-side g-side">
        <Link href="/panel" className="link-quiet back-link">← Wszystkie galerie</Link>
        <div className="g-side-head">
          <p className="g-side-kicker">Galeria</p>
          <h1 className="g-side-title">{gallery.title}</h1>
          <p className="g-side-meta">Utworzona {dateFmt.format(new Date(gallery.created_at))}</p>
        </div>
        <div className="g-side-cover">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover.webUrl} alt="" />
          ) : (
            <span>Okładką zostanie pierwsze zdjęcie. Zmienisz ją gwiazdką przy zdjęciu.</span>
          )}
        </div>
        <nav aria-label="Sekcje galerii">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={`/panel/galeria/${id}?tab=${t.key}`}
              className={tab === t.key ? "side-link active" : "side-link"}
              aria-current={tab === t.key ? "page" : undefined}
            >
              <span>{t.label}</span>
              {t.key === "zdjecia" && <span className="side-count">{photos.length}</span>}
            </Link>
          ))}
        </nav>
        <SideLogout />
      </aside>

      <main className="app-main">
        <ShareBar
          id={id}
          title={gallery.title}
          protectedByPassword={Boolean(meta?.passwordHash)}
          password={meta?.password ?? null}
          photoCount={photos.length}
        />

        <PlanBar
          id={id}
          planId={meta?.plan ?? null}
          period={meta?.period ?? null}
          expiresAt={meta?.expiresAt ?? null}
          usedBytes={usedBytes}
        />

        {tab === "ustawienia" ? (
          <SettingsForm
            id={id}
            title={gallery.title}
            hasPassword={Boolean(meta?.passwordHash)}
            layout={meta?.layout ?? "mozaika"}
          />
        ) : (
          <PhotoManager
            id={id}
            layout={meta?.layout ?? "mozaika"}
            cover={cover?.name ?? null}
            photos={photos.map((p) => ({
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
