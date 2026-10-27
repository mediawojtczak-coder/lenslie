import { notFound } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { getGuestEvent } from "@/lib/guest-events";
import { getUserBrand } from "@/lib/profiles";
import { siteUrl } from "@/lib/email";
import PrintCards from "./PrintCards";

export const dynamic = "force-dynamic";

// Kartki z kodem QR na stoły weselne (4 na stronie A4)
export default async function Druk({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await getUser();
  const e = await getGuestEvent(id);
  if (!e || e.uid !== user!.id) notFound();
  const brand = await getUserBrand(e.uid).catch(() => null);
  return <PrintCards title={e.title} date={e.date} lang={e.lang} url={`${siteUrl()}/goscie/${e.id}`} studio={brand?.studioName ?? null} back={`/panel/goscie/${e.id}`} />;
}
