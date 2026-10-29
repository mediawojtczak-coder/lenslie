import { NextResponse } from "next/server";
import { DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { r2, BUCKET, galleryPrefix } from "@/lib/r2";
import { listKeys } from "@/lib/photos";
import { getMeta, saveMeta, DRAFT_REMIND_DAYS, DRAFT_DELETE_DAYS, draftDeleteDate, type GalleryMeta } from "@/lib/galleries";
import { adminClient } from "@/lib/supabase/admin";
import { getOwnerContact, getGalleryBrand } from "@/lib/profiles";
import { clientExtendOn } from "@/lib/client-extend";
import { getUserLang } from "@/lib/lang-server";
import { deleteGalleryVideos, deleteVideo } from "@/lib/videos";
import { sendEmail, emailLayout, siteUrl, notifyAdmins } from "@/lib/email";
import { getReminders, lastReminderMail, markReminderMail } from "@/lib/reminders";
import { listObjects } from "@/lib/photos";
import { getDomainByHost, saveDomain, vercelRemoveDomain, DOMAIN_PRICE } from "@/lib/domains";
import { getGuestEvent, saveGuestEvent, deleteGuestEvent, GUEST_DELETE_AFTER } from "@/lib/guest-events";
import { getProSub, listProSubs, saveProSub, proGraceEnd, proTier, proName, type ProSub } from "@/lib/pro";

export const runtime = "nodejs";
export const maxDuration = 60;

const DAY = 24 * 3600 * 1000;
const REMIND_BEFORE = 3; // dni przed wygaśnięciem
const DELETE_AFTER = 30; // dni po wygaśnięciu
const WARN_BEFORE_DELETE = 7; // dni przed usunięciem

const fmtPl = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Warsaw" });
const fmtEn = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Warsaw" });
const dateIn = (lang: "pl" | "en") => (lang === "en" ? fmtEn : fmtPl);

async function galleryIds() {
  const ids: string[] = [];
  let token: string | undefined;
  do {
    const res = await r2.send(
      new ListObjectsV2Command({ Bucket: BUCKET, Prefix: "galleries/", Delimiter: "/", ContinuationToken: token }),
    );
    for (const p of res.CommonPrefixes ?? []) {
      const id = String(p.Prefix ?? "").split("/")[1];
      if (id) ids.push(id);
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return ids;
}

// Usuwa zdjęcia i wpis galerii, potem informuje fotografa
async function removeGallery(id: string, meta: GalleryMeta, db: ReturnType<typeof adminClient>, reason: "draft" | "expired") {
  const owner = await getOwnerContact(id);
  await deleteGalleryVideos(id, meta.videos ?? []);
  const keys = await listKeys(galleryPrefix(id));
  for (let i = 0; i < keys.length; i += 10) {
    await Promise.all(keys.slice(i, i + 10).map((Key) => r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key }))));
  }
  if (db) await db.from("galleries").delete().eq("id", id);
  if (owner?.lang === "en") {
    await sendEmail({
      to: owner.email,
      subject: `The gallery “${meta.title}” has been deleted`,
      html: emailLayout("Gallery deleted", [
        reason === "draft"
          ? `The gallery “${meta.title}” was not published within ${DRAFT_DELETE_DAYS} days, so we deleted it together with its photos.`
          : `In line with our storage rules, we deleted the gallery “${meta.title}” and its photos ${DELETE_AFTER} days after access expired.`,
      ], undefined, "en"),
    });
  } else if (owner) {
    await sendEmail({
      to: owner.email,
      subject: `Galeria „${meta.title}” została usunięta`,
      html: emailLayout("Galeria usunięta", [
        reason === "draft"
          ? `Galeria „${meta.title}” nie została opublikowana w ciągu ${DRAFT_DELETE_DAYS} dni, więc usunęliśmy ją razem ze zdjęciami.`
          : `Zgodnie z zasadami przechowywania usunęliśmy galerię „${meta.title}” i jej zdjęcia, ${DELETE_AFTER} dni po wygaśnięciu dostępu.`,
      ]),
    });
  }
}

// Codzienne zadanie: przypomnienia przed wygaśnięciem, ostrzeżenie przed usunięciem
// i usuwanie zdjęć 30 dni po wygaśnięciu. ?proba=1 tylko pokazuje, co by zrobiło.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Brak dostępu." }, { status: 401 });
  }
  const dry = new URL(req.url).searchParams.get("proba") === "1";
  const db = adminClient();
  const log: string[] = [];
  const now = Date.now();

  for (const id of await galleryIds()) {
    const meta = await getMeta(id).catch(() => null);
    if (!meta) continue;

    // Wersja robocza: przypomnienie po 10 dniach, usunięcie po 20 dniach od utworzenia
    if (!meta.plan) {
      const age = (now - new Date(meta.createdAt).getTime()) / DAY;
      if (!Number.isFinite(age)) continue;
      if (age >= DRAFT_DELETE_DAYS) {
        log.push(`${id}: usunięcie wersji roboczej`);
        if (!dry) await removeGallery(id, meta, db, "draft");
      } else if (age >= DRAFT_REMIND_DAYS && !meta.notices?.draft) {
        log.push(`${id}: przypomnienie o publikacji`);
        if (!dry) {
          const owner = await getOwnerContact(id);
          const dateFmt = dateIn(owner?.lang ?? "pl");
          const sent =
            owner &&
            (await sendEmail({
              to: owner.email,
              subject: owner.lang === "en" ? `Your gallery “${meta.title}” is waiting to be published` : `Twoja galeria „${meta.title}” czeka na publikację`,
              html: owner.lang === "en" ? emailLayout(
                "Your gallery is waiting to be published",
                [
                  `The gallery “${meta.title}” is still a draft, so your client cannot see it.`,
                  `Publish it to share the photos. We delete unpublished galleries ${DRAFT_DELETE_DAYS} days after creation – this one will be deleted on ${dateFmt.format(draftDeleteDate(meta))}.`,
                ],
                { label: "Publish gallery", url: `${siteUrl()}/panel/galeria/${id}` },
                "en",
              ) : emailLayout(
                "Galeria czeka na publikację",
                [
                  `Galeria „${meta.title}” jest wciąż wersją roboczą, więc klient jej nie widzi.`,
                  `Opublikuj ją, aby udostępnić zdjęcia. Nieopublikowane galerie usuwamy ${DRAFT_DELETE_DAYS} dni od utworzenia – ta zostanie usunięta ${dateFmt.format(draftDeleteDate(meta))}.`,
                ],
                { label: "Opublikuj galerię", url: `${siteUrl()}/panel/galeria/${id}` },
              ),
            }));
          if (sent) {
            meta.notices = { ...(meta.notices ?? {}), draft: new Date().toISOString() };
            await saveMeta(id, meta);
          }
        }
      }
      continue;
    }

    // Nieopłacone (i porzucone w trakcie wgrywania) filmy usuwamy po 7 dniach
    const staleVideos = (meta.videos ?? []).filter(
      (v) => (v.status === "unpaid" || v.status === "uploading") && now - new Date(v.createdAt).getTime() > 7 * DAY,
    );
    if (staleVideos.length) {
      log.push(`${id}: usunięcie nieopłaconych filmów (${staleVideos.length})`);
      if (!dry) {
        for (const v of staleVideos) await deleteVideo(v);
        meta.videos = (meta.videos ?? []).filter((v) => !staleVideos.includes(v));
        await saveMeta(id, meta);
      }
    }

    if (!meta.expiresAt) continue;
    const expires = new Date(meta.expiresAt).getTime();
    const daysLeft = (expires - now) / DAY;
    const notices = { ...(meta.notices ?? {}) };
    const panelUrl = `${siteUrl()}/panel/galeria/${id}`;

    // 0. Przypomnienia, które ustawił sobie klient w galerii
    const due = (meta.reminders ?? []).filter((r) => daysLeft > 0 && daysLeft <= r.days && r.sentFor !== meta.expiresAt);
    if (due.length) {
      log.push(`${id}: przypomnienia klienta (${due.length})`);
      if (!dry) {
        const en = meta.lang === "en";
        const dateFmt = dateIn(meta.lang ?? "pl");
        const brand = await getGalleryBrand(id).catch(() => ({ studioName: null as string | null }));
        const owner = await getOwnerContact(id).catch(() => null);
        const canExtend = clientExtendOn(meta);
        const until = dateFmt.format(new Date(expires));
        const left = Math.max(1, Math.ceil(daysLeft));
        for (const r of due) {
          const off = `${siteUrl()}/api/galleries/${id}/reminder?off=${r.token}`;
          const ok = await sendEmail({
            to: r.email,
            replyTo: owner?.email,
            subject: en ? `“${meta.title}” – gallery access ends on ${until}` : `„${meta.title}” – dostęp do galerii kończy się ${until}`,
            html: emailLayout(
              en ? "Your gallery expires soon" : "Galeria wkrótce wygaśnie",
              en
                ? [
                    `Access to the gallery “${meta.title}”${brand.studioName ? ` from ${brand.studioName}` : ""} ends in ${left} ${left === 1 ? "day" : "days"} – on ${until}.`,
                    canExtend
                      ? "Download the photos you want to keep, or extend access in the gallery with one click."
                      : "Download the photos you want to keep, or ask your photographer to extend access.",
                  ]
                : [
                    `Dostęp do galerii „${meta.title}”${brand.studioName ? ` od ${brand.studioName}` : ""} kończy się za ${left} ${left === 1 ? "dzień" : "dni"} – ${until}.`,
                    canExtend
                      ? "Pobierz zdjęcia, które chcesz zachować, albo przedłuż dostęp jednym kliknięciem w galerii."
                      : "Pobierz zdjęcia, które chcesz zachować, albo poproś fotografa o przedłużenie dostępu.",
                  ],
              { label: en ? "Open the gallery" : "Otwórz galerię", url: `${siteUrl()}/galeria/${id}` },
              meta.lang ?? "pl",
            ).replace(
              "</div></body></html>",
              `<p style="font-size:12px;color:#958c85;margin:8px 0 0">${en ? "You set this reminder in the gallery." : "To przypomnienie ustawiono w galerii."} <a href="${off}" style="color:#958c85">${en ? "Turn off reminders" : "Wyłącz przypomnienia"}</a></p></div></body></html>`,
            ),
          });
          if (ok) r.sentFor = meta.expiresAt;
        }
        await saveMeta(id, meta);
      }
    }

    // Galerie w abonamencie Pro: zamiast maili o każdej galerii – przypomnienia o abonamencie (niżej)
    const pro = meta.plan === "pro";

    // 1. Przypomnienie: galeria wkrótce wygaśnie
    if (!pro && daysLeft > 0 && daysLeft <= REMIND_BEFORE && !notices.expiring) {
      log.push(`${id}: przypomnienie o wygaśnięciu`);
      if (!dry) {
        const owner = await getOwnerContact(id);
        const dateFmt = dateIn(owner?.lang ?? "pl");
        const sent =
          owner &&
          (await sendEmail({
            to: owner.email,
            subject: owner.lang === "en" ? `The gallery “${meta.title}” expires on ${dateFmt.format(new Date(expires))}` : `Galeria „${meta.title}” wygasa ${dateFmt.format(new Date(expires))}`,
            html: owner.lang === "en" ? emailLayout(
              "Your gallery expires soon",
              [
                `Your client's access to the gallery “${meta.title}” ends on ${dateFmt.format(new Date(expires))}.`,
                `If your client needs more time, extend access in your dashboard. After expiry we keep the photos for another ${DELETE_AFTER} days and then delete them permanently.`,
              ],
              { label: "Extend access", url: panelUrl },
              "en",
            ) : emailLayout(
              "Galeria wkrótce wygaśnie",
              [
                `Dostęp klienta do galerii „${meta.title}” kończy się ${dateFmt.format(new Date(expires))}.`,
                `Jeśli klient potrzebuje więcej czasu, przedłuż dostęp w panelu. Po wygaśnięciu zdjęcia przechowujemy jeszcze ${DELETE_AFTER} dni, a potem usuwamy je na stałe.`,
              ],
              { label: "Przedłuż dostęp", url: panelUrl },
            ),
          }));
        if (sent) notices.expiring = new Date().toISOString();
      }
    }

    if (daysLeft <= 0) {
      const daysSince = -daysLeft;
      const deleteOn = new Date(expires + DELETE_AFTER * DAY);

      // 2. Ostrzeżenie: zdjęcia zostaną wkrótce usunięte
      if (!pro && daysSince >= DELETE_AFTER - WARN_BEFORE_DELETE && daysSince < DELETE_AFTER && !notices.deleting) {
        log.push(`${id}: ostrzeżenie przed usunięciem`);
        if (!dry) {
          const owner = await getOwnerContact(id);
          const dateFmt = dateIn(owner?.lang ?? "pl");
          const sent =
            owner &&
            (await sendEmail({
              to: owner.email,
              subject: owner.lang === "en" ? `Photos from “${meta.title}” will be deleted on ${dateFmt.format(deleteOn)}` : `Zdjęcia z galerii „${meta.title}” zostaną usunięte ${dateFmt.format(deleteOn)}`,
              html: owner.lang === "en" ? emailLayout(
                "Photos will be deleted soon",
                [
                  `The gallery “${meta.title}” expired on ${dateFmt.format(new Date(expires))}. On ${dateFmt.format(deleteOn)} we will delete it together with all photos.`,
                  "If you want to keep it, extend access in your dashboard.",
                ],
                { label: "Extend access", url: panelUrl },
                "en",
              ) : emailLayout(
                "Zdjęcia zostaną wkrótce usunięte",
                [
                  `Galeria „${meta.title}” wygasła ${dateFmt.format(new Date(expires))}. ${dateFmt.format(deleteOn)} usuniemy ją razem ze wszystkimi zdjęciami.`,
                  "Jeśli chcesz ją zachować, przedłuż dostęp w panelu.",
                ],
                { label: "Przedłuż dostęp", url: panelUrl },
              ),
            }));
          if (sent) notices.deleting = new Date().toISOString();
        }
      }

      // 3. Usunięcie galerii i zdjęć
      if (daysSince >= DELETE_AFTER) {
        log.push(`${id}: usunięcie galerii`);
        if (!dry) {
          await removeGallery(id, meta, db, "expired");
          continue;
        }
      }
    }

    if (!dry && JSON.stringify(notices) !== JSON.stringify(meta.notices ?? {})) {
      meta.notices = notices;
      await saveMeta(id, meta);
    }
  }

  // Abonamenty Pro: 7 dni przed końcem, w dniu końca (galerie działają jeszcze 30 dni) i 7 dni przed wyłączeniem galerii
  for (const sub of await listProSubs().catch(() => [])) {
    const end = new Date(sub.paidUntil).getTime();
    const graceEnd = proGraceEnd(sub).getTime();
    const n = sub.notices ?? {};
    const sentFor = (k: keyof NonNullable<ProSub["notices"]>) => n[k] === sub.paidUntil;
    let kind: "before" | "ended" | "grace" | null = null;
    if (now < end && end - now <= 7 * DAY && !sentFor("before")) kind = "before";
    else if (now >= end && now < graceEnd && graceEnd - now > 7 * DAY && !sentFor("ended")) kind = "ended";
    else if (now < graceEnd && graceEnd - now <= 7 * DAY && now >= end && !sentFor("grace")) kind = "grace";
    if (!kind) continue;
    log.push(`pro ${sub.uid}: przypomnienie (${kind})`);
    if (dry || !db) continue;
    const to = (await db.auth.admin.getUserById(sub.uid)).data?.user?.email;
    if (!to) continue;
    const lang = await getUserLang(sub.uid);
    const df = dateIn(lang);
    const tier = proTier(sub.tier);
    const name = tier ? proName(tier) : "Pro";
    const en = lang === "en";
    const subject =
      kind === "before"
        ? en ? `Your ${name} subscription ends on ${df.format(new Date(end))}` : `Abonament ${name} kończy się ${df.format(new Date(end))}`
        : kind === "ended"
          ? en ? `Your ${name} subscription has ended – galleries work until ${df.format(new Date(graceEnd))}` : `Abonament ${name} się skończył – galerie działają do ${df.format(new Date(graceEnd))}`
          : en ? `Your galleries will be switched off on ${df.format(new Date(graceEnd))}` : `${df.format(new Date(graceEnd))} galerie przestaną działać`;
    const lines =
      kind === "before"
        ? en
          ? [`Your ${name} subscription is paid until ${df.format(new Date(end))}.`, "Renew it to keep all galleries, videos and add-ons running without interruption."]
          : [`Abonament ${name} jest opłacony do ${df.format(new Date(end))}.`, "Odnów go, aby wszystkie galerie, filmy i dodatki działały bez przerwy."]
        : kind === "ended"
          ? en
            ? [`Your ${name} subscription ended on ${df.format(new Date(end))}.`, `Your clients can still open their galleries until ${df.format(new Date(graceEnd))}. You can't add new photos until you renew.`]
            : [`Abonament ${name} skończył się ${df.format(new Date(end))}.`, `Klienci mogą jeszcze otwierać galerie do ${df.format(new Date(graceEnd))}. Do czasu odnowienia nie dodasz nowych zdjęć.`]
          : en
            ? [`On ${df.format(new Date(graceEnd))} your Pro galleries will stop working for clients, and ${DELETE_AFTER} days later we will delete them.`, "Renew the subscription to keep them."]
            : [`${df.format(new Date(graceEnd))} galerie w abonamencie przestaną działać dla klientów, a ${DELETE_AFTER} dni później je usuniemy.`, "Odnów abonament, aby je zachować."];
    const ok = await sendEmail({
      to,
      subject,
      html: emailLayout(en ? "Lenslie Pro" : "Abonament Lenslie Pro", lines, { label: en ? "Renew subscription" : "Odnów abonament", url: `${siteUrl()}/panel/pro` }, lang),
    }).catch(() => false);
    if (ok) await saveProSub({ ...sub, notices: { ...n, [kind]: sub.paidUntil } });
  }

  // Zdjęcia od gości: ostrzeżenie 7 dni przed usunięciem, usunięcie 30 dni po wygaśnięciu
  const guestIds: string[] = [];
  {
    let token: string | undefined;
    do {
      const res = await r2.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: "guests/", Delimiter: "/", ContinuationToken: token }));
      for (const p of res.CommonPrefixes ?? []) {
        const gid = String(p.Prefix ?? "").split("/")[1];
        if (gid) guestIds.push(gid);
      }
      token = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (token);
  }
  for (const gid of guestIds) {
    const ge = await getGuestEvent(gid).catch(() => null);
    if (!ge?.expiresAt) continue;
    const deleteOn = new Date(new Date(ge.expiresAt).getTime() + GUEST_DELETE_AFTER * DAY);
    const left = (deleteOn.getTime() - now) / DAY;
    if (left <= 0) {
      log.push(`goście ${gid}: usunięcie`);
      if (!dry) await deleteGuestEvent(ge);
    } else if (left <= 7 && !ge.warned) {
      log.push(`goście ${gid}: ostrzeżenie przed usunięciem`);
      if (!dry && db) {
        const to = (await db.auth.admin.getUserById(ge.uid)).data?.user?.email;
        const lang = await getUserLang(ge.uid);
        const df = dateIn(lang);
        if (to) {
          await sendEmail({
            to,
            subject: lang === "en" ? `Guest photos “${ge.title}” will be deleted on ${df.format(deleteOn)}` : `Zdjęcia od gości „${ge.title}” zostaną usunięte ${df.format(deleteOn)}`,
            html: emailLayout(
              lang === "en" ? "Download the guest photos" : "Pobierz zdjęcia od gości",
              [
                lang === "en"
                  ? `The guest gallery “${ge.title}” has ended. On ${df.format(deleteOn)} we will delete it with all photos – download them before then.`
                  : `Galeria gości „${ge.title}” zakończyła się. ${df.format(deleteOn)} usuniemy ją ze wszystkimi zdjęciami – pobierz je wcześniej.`,
              ],
              { label: lang === "en" ? "Download photos" : "Pobierz zdjęcia", url: `${siteUrl()}/panel/goscie/${gid}` },
              lang,
            ),
          }).catch(() => undefined);
        }
        await saveGuestEvent({ ...ge, warned: new Date().toISOString() });
      }
    }
  }

  // Własne domeny: przypomnienie 7 dni przed końcem, odłączenie po wygaśnięciu
  for (const o of await listObjects("domains/hosts/").catch(() => [])) {
    const rec = await getDomainByHost(o.key.slice("domains/hosts/".length).replace(/\.json$/, ""));
    if (!rec) continue;
    const left = (new Date(rec.paidUntil).getTime() - now) / DAY;
    if (left <= 0 && !rec.detached) {
      log.push(`domena ${rec.host}: odłączenie`);
      if (!dry) {
        await vercelRemoveDomain(rec.host);
        await saveDomain({ ...rec, detached: true });
      }
    } else if (left > 0 && left <= 7 && !rec.reminded && !(await getProSub(rec.uid).catch(() => null))) {
      // (przy abonamencie Pro domena trwa razem z nim – przypomina mail o abonamencie)
      log.push(`domena ${rec.host}: przypomnienie`);
      if (!dry && db) {
        const to = (await db.auth.admin.getUserById(rec.uid)).data?.user?.email;
        const lang = await getUserLang(rec.uid);
        const dateFmt = dateIn(lang);
        if (to && lang === "en") {
          await sendEmail({
            to,
            subject: `The domain ${rec.host} expires on ${dateFmt.format(new Date(rec.paidUntil))}`,
            html: emailLayout(
              "Your custom domain expires soon",
              [`Your galleries at ${rec.host} work until ${dateFmt.format(new Date(rec.paidUntil))}. Renew the domain for a year for PLN ${DOMAIN_PRICE} from your balance so your clients' links keep working.`],
              { label: "Renew domain", url: `${siteUrl()}/panel/konto?tab=domena` },
              "en",
            ),
          });
        } else if (to) {
          await sendEmail({
            to,
            subject: `Domena ${rec.host} wygasa ${dateFmt.format(new Date(rec.paidUntil))}`,
            html: emailLayout(
              "Własna domena wkrótce wygaśnie",
              [`Twoje galerie pod adresem ${rec.host} działają do ${dateFmt.format(new Date(rec.paidUntil))}. Przedłuż domenę o rok za ${DOMAIN_PRICE} zł z salda, aby linki u klientów dalej działały.`],
              { label: "Przedłuż domenę", url: `${siteUrl()}/panel/konto?tab=domena` },
            ),
          });
        }
        await saveDomain({ ...rec, reminded: true });
      }
    }
  }

  // Przypomnienia dla właściciela – raz w tygodniu
  const last = await lastReminderMail();
  if (!last || Date.now() - new Date(last).getTime() > 7 * DAY - 3600 * 1000) {
    const rem = await getReminders();
    if (rem.length && !dry) {
      await notifyAdmins(
        `Lenslie: ${rem.length} ${rem.length === 1 ? "sprawa" : "sprawy"} do zrobienia`,
        "Przypomnienia",
        rem.map((r) => `[${r.level.toUpperCase()}] ${r.title}. ${r.text}`),
      );
      await markReminderMail();
    }
    log.push(`przypomnienia: ${rem.length}`);
  }

  return NextResponse.json({ ok: true, dry, actions: log });
}
