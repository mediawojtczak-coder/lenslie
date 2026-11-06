import Link from "next/link";
import SideLogout from "@/components/SideLogout";
import MailFrame from "@/components/MailFrame";
import GalleryNudge from "../GalleryNudge";
import { getUser } from "@/lib/supabase/server";
import { getLang } from "@/lib/lang-server";
import { tr, locale } from "@/lib/lang";
import { getMeta, isExpired } from "@/lib/galleries";
import { getGallerySummary } from "@/lib/photos";
import { coupleReminderMail, COUPLE_REMIND_DAYS } from "@/lib/couple-mail";
import { siteUrl } from "@/lib/email";

export const dynamic = "force-dynamic";

// Przypomnienie dla klienta: jak działa, jak wygląda mail i e-maile klientów we wszystkich galeriach
export default async function PrzypomnieniaPanel() {
  const { supabase, user } = await getUser();
  const lang = await getLang();
  const en = lang === "en";
  const t = (pl: string, eng: string) => tr(lang, pl, eng);
  const dateFmt = new Intl.DateTimeFormat(locale(lang), { day: "numeric", month: "long", year: "numeric" });

  const [{ data }, { data: profile }] = await Promise.all([
    supabase.from("galleries").select("id, title, created_at").order("created_at", { ascending: false }),
    supabase.from("profiles").select("studio_name").eq("id", user!.id).maybeSingle(),
  ]);
  const studio = ((profile as { studio_name: string | null } | null)?.studio_name ?? "").trim();

  const all = await Promise.all(
    ((data ?? []) as { id: string; title: string }[]).map(async (g) => {
      const meta = await getMeta(g.id).catch(() => null);
      const summary = await getGallerySummary(g.id, meta?.cover, meta?.coverFile).catch(() => ({ count: 0, coverUrl: null }));
      return { ...g, meta, cover: summary.coverUrl };
    }),
  );
  // przypomnienie ma sens tylko w opublikowanych galeriach, którym dostęp jeszcze trwa
  const rows = all.filter((g) => g.meta?.plan && !isExpired(g.meta));
  const withEmail = rows.filter((g) => g.meta?.clientEmail).length;

  // podgląd na przykładzie najnowszej galerii fotografa (albo przykładowej)
  const sample = rows.find((g) => g.cover) ?? rows[0];
  const until = sample?.meta?.expiresAt ? new Date(sample.meta.expiresAt) : new Date(Date.now() + 90 * 24 * 3600 * 1000);
  const mail = coupleReminderMail({
    studio: studio || null,
    title: sample?.title ?? "Magdalena & Szymon",
    coverUrl: sample?.cover ?? "/home/foto-2.jpg",
    link: sample ? `${siteUrl()}/galeria/${sample.id}` : `${siteUrl()}/galeria/…`,
    password: sample ? (sample.meta?.password ?? null) : "lato2027",
    until: dateFmt.format(until),
    en,
    daysLeft: COUPLE_REMIND_DAYS,
    canExtend: true,
    offUrl: "#",
  });
  const from = studio ? `${studio} ${en ? "via" : "przez"} Lenslie` : "Lenslie";

  return (
    <div className="app-body">
      <aside className="app-side">
        <Link href="/panel" className="link-quiet back-link">← {t("Galerie", "Galleries")}</Link>
        <nav aria-label={t("Przypomnienie dla klienta", "Client reminder")}>
          <span className="side-link active">{t("Przypomnienie dla klienta", "Client reminder")}</span>
        </nav>
        <SideLogout />
      </aside>
      <main className="app-main">
        <section className="fsp-intro">
          <p className="fs-kicker">{t("W cenie każdej galerii", "Included with every gallery")}</p>
          <h1>{t("Przypomnienie dla klienta", "Client reminder")}</h1>
          <p>
            {t(
              `Wpisz e-mail klienta przy galerii – zapisze się sam. ${COUPLE_REMIND_DAYS} dni przed końcem dostępu wyślemy mu elegancki mail z okładką, hasłem i przyciskiem do zdjęć, podpisany nazwą Twojego studia.`,
              `Enter the client's e-mail next to the gallery – it saves itself. ${COUPLE_REMIND_DAYS} days before access ends we'll send them an elegant e-mail with the cover, password and a button to the photos, signed with your studio name.`,
            )}
          </p>
          <Link href="/przypomnienie" className="as-link" target="_blank">
            {t("Strona o tej funkcji ›", "About this feature ›")}
          </Link>
        </section>

        <div className="rmp">
          <section className="rmp-how">
            <h2>{t("Jak to działa", "How it works")}</h2>
            <ol>
              <li>
                <b>{t("Wpisujesz e-mail klienta", "Enter the client's e-mail")}</b>
                <span>{t("Na kafelku galerii albo na liście poniżej. Bez przycisków – zapisuje się po chwili. Możesz podać dwa adresy, po przecinku.", "On the gallery tile or in the list below. No buttons – it saves after a moment. You can add two addresses, separated by a comma.")}</span>
              </li>
              <li>
                <b>{t("Widzisz dzień wysyłki", "You see the send date")}</b>
                <span>
                  {t(
                    `Obok adresu pojawia się data – ${COUPLE_REMIND_DAYS} dni przed końcem dostępu. Po wysyłce zobaczysz „wysłane”.`,
                    `A date appears next to the address – ${COUPLE_REMIND_DAYS} days before access ends. After sending you'll see “sent”.`,
                  )}
                </span>
              </li>
              <li>
                <b>{t("Lenslie wysyła mail", "Lenslie sends the e-mail")}</b>
                <span>{t("Rano, automatycznie. Nadawcą jest Twoje studio, a odpowiedź klienta trafia prosto do Ciebie.", "In the morning, automatically. Your studio is the sender and the client's reply comes straight to you.")}</span>
              </li>
              <li>
                <b>{t("Klient wraca po zdjęcia", "The client comes back")}</b>
                <span>{t("Pobiera je jednym kliknięciem, a jeśli potrzebuje czasu – sam przedłuża dostęp. Po przedłużeniu przypomnienie przyjdzie znowu przed nowym terminem.", "Downloads them in one click and, if they need time, extends access themselves. After an extension the reminder comes again before the new date.")}</span>
              </li>
            </ol>
            <p className="rmp-note">
              {t("Galerie Pro nie wygasają, więc przypomnienie nie jest im potrzebne. Klient może je wyłączyć linkiem w stopce maila.", "Pro galleries don't expire, so they don't need a reminder. The client can switch it off with the link in the e-mail footer.")}
            </p>
            {!studio && (
              <p className="rmp-warn">
                {t("Dodaj nazwę studia, aby mail był podpisany Twoją marką.", "Add your studio name so the e-mail is signed with your brand.")}{" "}
                <Link href="/panel/konto?tab=studio">{t("Uzupełnij ›", "Add it ›")}</Link>
              </p>
            )}
          </section>

          <section className="rmp-mail">
            <p className="rmp-label">{t("Tak zobaczy go klient", "What your client will see")}</p>
            <MailFrame html={mail.html} from={from} fromLabel={t("Od", "From")} subject={mail.subject} />
          </section>
        </div>

        <section className="rmp-list">
          <div className="rmp-list-head">
            <h2>{t("E-maile klientów", "Client e-mails")}</h2>
            {rows.length > 0 && (
              <span>
                {withEmail} / {rows.length} {t("galerii z adresem", "galleries with an address")}
              </span>
            )}
          </div>
          {rows.length === 0 ? (
            <p className="hint-inline">{t("Opublikuj galerię, aby ustawić przypomnienie dla klienta.", "Publish a gallery to set up a client reminder.")}</p>
          ) : (
            <ul className="rmp-rows">
              {rows.map((g) => {
                const m = g.meta!;
                const pro = m.plan === "pro";
                const sent = Boolean(m.expiresAt && (m.reminders ?? []).some((r) => r.by === "photographer" && r.sentFor === m.expiresAt));
                return (
                  <li key={g.id}>
                    <Link href={`/panel/galeria/${g.id}`} className="fsp-thumb" style={g.cover ? { backgroundImage: `url(${g.cover})` } : undefined} aria-label={g.title} />
                    <div className="rmp-row-main">
                      <Link href={`/panel/galeria/${g.id}`} className="rmp-title">
                        {g.title}
                      </Link>
                      <p>{pro || !m.expiresAt ? t("Bez terminu wygaśnięcia", "No expiry date") : `${t("Dostęp do", "Available until")} ${dateFmt.format(new Date(m.expiresAt))}`}</p>
                      <GalleryNudge id={g.id} email={m.clientEmail ?? null} expiresAt={pro ? null : (m.expiresAt ?? null)} sent={sent} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
