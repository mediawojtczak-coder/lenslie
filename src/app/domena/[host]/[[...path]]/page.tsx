import { notFound } from "next/navigation";
import { getDomainByHost, domainActive } from "@/lib/domains";
import { isValidGalleryId } from "@/lib/r2";
import { adminClient } from "@/lib/supabase/admin";
import { ClientGallery } from "@/app/galeria/[id]/ClientGallery";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

// Galerie pod własną domeną fotografa: galerie.studio.pl/<galeria> (middleware kieruje tu ruch z obcych domen)
export default async function DomenaFotografa({
  params,
  searchParams,
}: {
  params: Promise<{ host: string; path?: string[] }>;
  searchParams: Promise<{ blad?: string }>;
}) {
  const { host, path = [] } = await params;
  const { blad } = await searchParams;
  const rec = await getDomainByHost(decodeURIComponent(host));

  if (!rec || !domainActive(rec)) {
    return (
      <section className="expired-page">
        <h1>Galeria niedostępna</h1>
        <p>Ten adres nie jest obecnie aktywny.</p>
      </section>
    );
  }

  // /<id> albo /galeria/<id>
  const id = path[0] === "galeria" ? path[1] : path[0];
  if (!id) {
    return (
      <section className="expired-page">
        <h1>Galerie zdjęć</h1>
        <p>Otwórz link do galerii, który otrzymałeś od fotografa.</p>
      </section>
    );
  }
  if (!isValidGalleryId(id) || path.includes("goscie")) notFound();

  // Pod domeną fotografa pokazujemy tylko jego galerie
  const db = adminClient();
  const { data } = db ? await db.from("galleries").select("owner_id").eq("id", id).maybeSingle() : { data: null };
  if (!data || data.owner_id !== rec.uid) notFound();

  return <ClientGallery id={id} blad={blad} />;
}
