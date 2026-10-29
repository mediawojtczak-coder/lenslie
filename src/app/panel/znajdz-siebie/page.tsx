import Link from "next/link";
import SideLogout from "@/components/SideLogout";
import { getUser } from "@/lib/supabase/server";
import { getLang } from "@/lib/lang-server";
import { tr, money } from "@/lib/lang";
import { getMeta } from "@/lib/galleries";
import { getGallerySummary } from "@/lib/photos";
import { FACES_PRICE } from "@/lib/faces";
import { activePro } from "@/lib/pro";

export const dynamic = "force-dynamic";

// „Znajdź siebie na zdjęciach” w panelu: stan funkcji w każdej galerii
export default async function ZnajdzSiebiePanel() {
  const { supabase, user } = await getUser();
  const pro = await activePro(user?.id).catch(() => null);
  const lang = await getLang();
  const t = (pl: string, en: string) => tr(lang, pl, en);
  const { data } = await supabase.from("galleries").select("id, title, created_at").order("created_at", { ascending: false });
  const rows = await Promise.all(
    ((data ?? []) as { id: string; title: string }[]).map(async (g) => {
      const [meta, summary] = await Promise.all([getMeta(g.id).catch(() => null), getGallerySummary(g.id).catch(() => ({ count: 0, coverUrl: null }))]);
      return { ...g, meta, count: summary.count, cover: summary.coverUrl };
    }),
  );

  return (
    <div className="app-body">
      <aside className="app-side">
        <Link href="/panel" className="link-quiet back-link">← {t("Galerie", "Galleries")}</Link>
        <nav aria-label={t("Znajdź siebie", "Find me")}>
          <span className="side-link active">{t("Znajdź siebie", "Find me")}</span>
        </nav>
        <SideLogout />
      </aside>
      <main className="app-main">
        <section className="fsp-intro">
          <div>
            <p className="fs-kicker">{t("Znajdź siebie na zdjęciach", "Find yourself in the photos")}</p>
            <h1>{t("Jedno selfie – wszystkie zdjęcia z gościem", "One selfie – every photo of that guest")}</h1>
            <p>
              {pro
                ? t(
                    "W abonamencie Pro włączysz ją w każdej galerii bez opłat. Klient i goście robią selfie, a galeria pokazuje tylko zdjęcia, na których są.",
                    "With Pro you can turn it on in any gallery at no extra cost. Your client and guests take a selfie and the gallery shows only the photos they're in.",
                  )
                : t(
                    `Włącz w wybranej galerii za ${money(FACES_PRICE, lang)} jednorazowo. Klient i goście robią selfie, a galeria pokazuje tylko zdjęcia, na których są.`,
                    `Turn it on in a gallery for a one-off ${money(FACES_PRICE, lang)}. Your client and guests take a selfie and the gallery shows only the photos they're in.`,
                  )}
            </p>
            <Link href="/znajdz-siebie" className="as-link" target="_blank">
              {t("Zobacz, jak to działa ›", "See how it works ›")}
            </Link>
          </div>
        </section>

        {rows.length === 0 ? (
          <p className="hint-inline">{t("Utwórz galerię, aby włączyć w niej tę funkcję.", "Create a gallery to turn this feature on.")}</p>
        ) : (
          <ul className="booking-list">
            {rows.map((g) => {
              const f = g.meta?.faces;
              const on = Boolean(f?.paid && f.enabled);
              const ready = on && (f?.indexed ?? 0) > 0;
              return (
                <li key={g.id}>
                  <Link href={`/panel/galeria/${g.id}?tab=ustawienia#twarze`} className="booking-item fsp-item">
                    <span className="fsp-thumb" style={g.cover ? { backgroundImage: `url(${g.cover})` } : undefined} />
                    <div>
                      <h2>{g.title}</h2>
                      <p>
                        {g.count} {t("zdjęć", "photos")}
                        {ready && ` · ${t("przygotowane", "prepared")}: ${Math.min(f?.indexed ?? 0, g.count)}`}
                      </p>
                    </div>
                    <div className="booking-nums">
                      <span className={ready ? "order-status delivered" : on ? "order-status paid" : "order-status"}>
                        {ready ? t("Działa", "Active") : on ? t("Do przygotowania", "Needs preparing") : f?.paid ? t("Wyłączone", "Off") : t("Nie włączone", "Not on")}
                      </span>
                      <small>{f?.paid ? t("Ustawienia ›", "Settings ›") : pro ? t("Włącz ›", "Turn on ›") : `${t("Włącz za", "Turn on for")} ${money(FACES_PRICE, lang)} ›`}</small>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
