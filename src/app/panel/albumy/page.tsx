import Link from "next/link";
import { activePro } from "@/lib/pro";
import SideLogout from "@/components/SideLogout";
import { getUser } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/supabase/admin";
import { getLang } from "@/lib/lang-server";
import { tr, locale, money } from "@/lib/lang";
import { getBilling } from "@/lib/billing";
import { getWallet } from "@/lib/wallet";
import { notFound } from "next/navigation";
import { getAlbumSub, albumActive, albumAllowed, ALBUM_PRICES } from "@/lib/albums";
import { getGallerySummary } from "@/lib/photos";
import AlbumSubCard from "./AlbumSubCard";

export const dynamic = "force-dynamic";

// Projektor albumów: czym jest, abonament i galerie z wyborami klientów
export default async function AlbumyPage() {
  const { supabase, user } = await getUser();
  if (!albumAllowed(user?.email)) notFound();
  const lang = await getLang();
  const t = (pl: string, en: string) => tr(lang, pl, en);
  const fmt = new Intl.DateTimeFormat(locale(lang), { day: "numeric", month: "long", year: "numeric" });
  const [sub, billing, wallet] = await Promise.all([
    user ? getAlbumSub(user.id).catch(() => ({})) : Promise.resolve({}),
    user ? getBilling(user.id) : Promise.resolve(null),
    user ? getWallet(user.id) : Promise.resolve({ balance: 0 }),
  ]);
  // abonament Pro: projektor albumów w cenie
  const pro = user ? await activePro(user.id).catch(() => null) : null;
  const paidUntil = pro ? pro.paidUntil : (sub as { paidUntil?: string }).paidUntil;
  const active = Boolean(pro) || albumActive(sub);
  const admin = isAdminEmail(user?.email);

  const { data } = await supabase.from("galleries").select("id, title, created_at").order("created_at", { ascending: false });
  const { data: sels } = await supabase.from("selections").select("gallery_id, photos");
  const picked = new Map<string, number>();
  for (const s of (sels ?? []) as { gallery_id: string; photos: string[] | null }[]) {
    picked.set(s.gallery_id, (picked.get(s.gallery_id) ?? 0) + (s.photos?.length ?? 0));
  }
  const rows = await Promise.all(
    ((data ?? []) as { id: string; title: string }[]).map(async (g) => ({
      ...g,
      picked: picked.get(g.id) ?? 0,
      cover: (await getGallerySummary(g.id).catch(() => ({ coverUrl: null }))).coverUrl,
    })),
  );
  rows.sort((a, b) => b.picked - a.picked);

  return (
    <div className="app-body">
      <aside className="app-side">
        <Link href="/panel" className="link-quiet back-link">← {t("Galerie", "Galleries")}</Link>
        <nav aria-label={t("Projektor albumów", "Album designer")}>
          <span className="side-link active">{t("Projektor albumów", "Album designer")}</span>
        </nav>
        <SideLogout />
      </aside>
      <main className="app-main">
        <div className="lr">
          <section className="lr-hero alb-hero">
            <div>
              <p className="fs-kicker">{t("Projektor albumów", "Album designer")}</p>
              <h1>{t("Klient wybiera zdjęcia, album projektuje się sam", "Your client picks photos, the album designs itself")}</h1>
              <p className="lr-lead">
                {t(
                  "Lenslie układa wybrane zdjęcia w nowoczesne rozkładówki – z powietrzem, panoramami i wyważonymi siatkami. Poprawiasz kilka rzeczy i pobierasz gotowe pliki do drukarni: 15×15, 20×20 albo 25×25 cm.",
                  "Lenslie lays the chosen photos out into modern spreads – with white space, panoramas and balanced grids. Tweak a few things and download print-ready files: 15×15, 20×20 or 25×25 cm.",
                )}
              </p>
              <p className="lr-ver">
                {money(ALBUM_PRICES[1], lang)} {t("miesięcznie", "per month")} · {money(ALBUM_PRICES[12], lang)} {t("rocznie", "per year")} · {t("bez limitu albumów", "unlimited albums")} · {t("pierwszy album gratis", "first album free")}
              </p>
            </div>
            <div className="alb-demo" aria-hidden="true">
              <div className="alb-demo-spread">
                <span style={{ left: "0%", top: "0%", width: "50%", height: "100%", backgroundImage: "url(/home/foto-1.jpg)" }} />
                <span style={{ left: "60%", top: "13%", width: "30%", height: "74%", backgroundImage: "url(/home/foto-2.jpg)" }} />
              </div>
              <div className="alb-demo-spread">
                <span style={{ left: "4.5%", top: "9%", width: "21%", height: "82%", backgroundImage: "url(/home/foto-4.jpg)" }} />
                <span style={{ left: "26.5%", top: "9%", width: "19%", height: "40%", backgroundImage: "url(/home/foto-6.jpg)" }} />
                <span style={{ left: "26.5%", top: "51%", width: "19%", height: "40%", backgroundImage: "url(/home/foto-3.jpg)" }} />
                <span style={{ left: "54.5%", top: "20%", width: "41%", height: "60%", backgroundImage: "url(/home/foto-7.jpg)" }} />
              </div>
            </div>
          </section>

          <section className="lr-steps">
            <h2>{t("Jak to działa", "How it works")}</h2>
            <ol>
              <li>
                <span>1</span>
                <div>
                  <h3>{t("Klient wybiera", "Client picks")}</h3>
                  <p>{t("W galerii zaznacza serduszkiem zdjęcia do albumu. Limit wyboru ustawisz w ustawieniach galerii.", "In the gallery they mark album photos with a heart. Set a selection limit in the gallery settings.")}</p>
                </div>
              </li>
              <li>
                <span>2</span>
                <div>
                  <h3>{t("Lenslie projektuje", "Lenslie designs")}</h3>
                  <p>{t("Zakładka „Album” w galerii: format, styl, kolor tła – projekt gotowy w kilka sekund.", "The gallery's “Album” tab: size, style, page colour – the design is ready in seconds.")}</p>
                </div>
              </li>
              <li>
                <span>3</span>
                <div>
                  <h3>{t("Poprawiasz", "You adjust")}</h3>
                  <p>{t("Zamieniasz zdjęcia, zmieniasz układ i kolejność rozkładówek, przesuwasz kadr.", "Swap photos, change layouts and spread order, move the crop.")}</p>
                </div>
              </li>
              <li>
                <span>4</span>
                <div>
                  <h3>{t("Pobierasz", "You download")}</h3>
                  <p>{t("Rozkładówki JPEG 300 dpi ze spadem, z oryginałów zdjęć – gotowe do wysłania do drukarni.", "300 dpi JPEG spreads with bleed, from the original photos – ready for the print lab.")}</p>
                </div>
              </li>
            </ol>
          </section>

          <section className="lr-grid">
            <div className="settings-card">
              <h2>{t("Galerie z wyborem klienta", "Galleries with client picks")}</h2>
              {rows.length === 0 ? (
                <p className="hint-inline">{t("Nie masz jeszcze galerii.", "You don't have any galleries yet.")}</p>
              ) : (
                <ul className="alb-galleries">
                  {rows.slice(0, 30).map((g) => (
                    <li key={g.id}>
                      <Link href={`/panel/galeria/${g.id}?tab=album`}>
                        {g.cover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={g.cover} alt="" loading="lazy" />
                        ) : (
                          <span className="alb-noimg" />
                        )}
                        <span>
                          <strong>{g.title}</strong>
                          <small>{g.picked > 0 ? `${g.picked} ${t("zaznaczonych zdjęć", "picked photos")}` : t("brak wyboru klienta", "no client picks yet")}</small>
                        </span>
                        <em>{t("Projektuj ›", "Design ›")}</em>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="settings-card">
              {active || admin ? (
                <>
                  <h2>{t("Abonament", "Subscription")}</h2>
                  <p className="success-box">
                    {admin && !active
                      ? t("Konto administratora – pobieranie bez abonamentu.", "Admin account – downloads without a subscription.")
                      : `${t("Aktywny do", "Active until")} ${fmt.format(new Date(paidUntil!))}`}
                  </p>
                  {pro && <p className="hint-inline">{t("Projektor albumów jest w cenie Twojego abonamentu Pro.", "The album designer is included in your Pro subscription.")}</p>}
                  {active && !pro && <p className="hint-inline">{t("Możesz przedłużyć abonament – nowy okres doliczy się do obecnego.", "You can extend – the new period is added to the current one.")}</p>}
                  {active && !pro && <AlbumSubCard balance={wallet.balance} billing={billing ?? { want: false, company: "", nip: "", street: "", postcode: "", city: "" }} returnPath="/panel/albumy" compact />}
                </>
              ) : (
                <AlbumSubCard balance={wallet.balance} billing={billing ?? { want: false, company: "", nip: "", street: "", postcode: "", city: "" }} returnPath="/panel/albumy" />
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
