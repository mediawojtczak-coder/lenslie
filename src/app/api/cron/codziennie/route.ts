import { NextResponse } from "next/server";
import { DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { r2, BUCKET, galleryPrefix } from "@/lib/r2";
import { listKeys } from "@/lib/photos";
import { getMeta, saveMeta, DRAFT_REMIND_DAYS, DRAFT_DELETE_DAYS, draftDeleteDate, type GalleryMeta } from "@/lib/galleries";
import { adminClient } from "@/lib/supabase/admin";
import { getOwnerContact } from "@/lib/profiles";
import { getUserLang } from "@/lib/lang-server";
import { deleteGalleryVideos, deleteVideo } from "@/lib/videos";
import { sendEmail, emailLayout, siteUrl, notifyAdmins } from "@/lib/email";
import { getReminders, lastReminderMail, markReminderMail } from "@/lib/reminders";
import { listObjects } from "@/lib/photos";
import { getDomainByHost, saveDomain, vercelRemoveDomain, DOMAIN_PRICE } from "@/lib/domains";
import { getGuestEvent, saveGuestEvent, deleteGuestEvent, GUEST_DELETE_AFTER } from "@/lib/guest-events";

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

    // 1. Przypomnienie: galeria wkrótce wygaśnie
    if (daysLeft > 0 && daysLeft <= REMIND_BEFORE && !notices.expiring) {
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
      if (daysSince >= DELETE_AFTER - WARN_BEFORE_DELETE && daysSince < DELETE_AFTER && !notices.deleting) {
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
    } else if (left > 0 && left <= 7 && !rec.reminded) {
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
