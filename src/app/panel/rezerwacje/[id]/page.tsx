import Link from "next/link";
import { notFound } from "next/navigation";
import SideLogout from "@/components/SideLogout";
import { getUser } from "@/lib/supabase/server";
import { getLang } from "@/lib/lang-server";
import { tr } from "@/lib/lang";
import { getEvent, listReservations, slotPast } from "@/lib/bookings";
import { siteUrl } from "@/lib/email";
import BookingEditor from "./BookingEditor";

export const dynamic = "force-dynamic";

// Jeden kalendarz rezerwacji: ustawienia, terminy i zapisani klienci
export default async function Kalendarz({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await getUser();
  const e = await getEvent(id);
  if (!e || e.uid !== user!.id) notFound();
  const lang = await getLang();
  const t = (pl: string, en: string) => tr(lang, pl, en);
  const res = await listReservations(e.id);

  return (
    <div className="app-body">
      <aside className="app-side">
        <Link href="/panel/rezerwacje" className="link-quiet back-link">← {t("Wszystkie kalendarze", "All calendars")}</Link>
        <div className="g-side-head">
          <p className="g-side-kicker">{t("Rezerwacje", "Bookings")}</p>
          <h1 className="g-side-title">{e.title}</h1>
        </div>
        <SideLogout />
      </aside>
      <main className="app-main">
        <BookingEditor
          event={{ id: e.id, title: e.title, description: e.description, location: e.location, price: e.price, duration: e.duration, lang: e.lang, open: e.open }}
          slots={e.slots.map((s) => {
            const r = res.get(s.id);
            return { ...s, past: slotPast(s), booking: r ? { name: r.name, email: r.email, phone: r.phone, note: r.note } : null };
          })}
          publicUrl={`${siteUrl()}/rezerwacja/${e.id}`}
        />
      </main>
    </div>
  );
}
