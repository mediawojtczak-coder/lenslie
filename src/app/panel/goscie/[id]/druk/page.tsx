import { notFound } from "next/navigation";
import { Great_Vibes } from "next/font/google";
import { getUser } from "@/lib/supabase/server";
import { getGuestEvent } from "@/lib/guest-events";
import { getUserBrand } from "@/lib/profiles";
import { siteUrl } from "@/lib/email";
import PrintCards from "./PrintCards";

export const dynamic = "force-dynamic";

const script = Great_Vibes({ weight: "400", subsets: ["latin", "latin-ext"], variable: "--font-script", display: "block" });

// Kartki z kodem QR na stoły weselne (4 na stronie A4)
export default async function Druk({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await getUser();
  const e = await getGuestEvent(id);
  if (!e || e.uid !== user!.id) notFound();
  const brand = await getUserBrand(e.uid).catch(() => null);
  return (
    <div className={script.variable}>
      <PrintCards title={e.title} date={e.date} lang={e.lang} url={`${siteUrl()}/goscie/${e.id}`} studio={brand?.studioName ?? null} back={`/panel/goscie/${e.id}`} />
    </div>
  );
}
