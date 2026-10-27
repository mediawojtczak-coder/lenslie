import { NextResponse } from "next/server";
import { DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { r2, BUCKET, galleryPrefix } from "@/lib/r2";
import { listKeys } from "@/lib/photos";
import { getMeta, saveMeta, DRAFT_REMIND_DAYS, DRAFT_DELETE_DAYS, draftDeleteDate, type GalleryMeta } from "@/lib/galleries";
import { adminClient } from "@/lib/supabase/admin";
import { getOwnerEmail } from "@/lib/profiles";
import { sendEmail, emailLayout, siteUrl, notifyAdmins } from "@/lib/email";
import { getReminders, lastReminderMail, markReminderMail } from "@/lib/reminders";

export const runtime = "nodejs";
export const maxDuration = 60;

const DAY = 24 * 3600 * 1000;
const REMIND_BEFORE = 3; // dni przed wygaśnięciem
const DELETE_AFTER = 30; // dni po wygaśnięciu
const WARN_BEFORE_DELETE = 7; // dni przed usunięciem

const dateFmt = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Warsaw" });

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
  const to = await getOwnerEmail(id);
  const keys = await listKeys(galleryPrefix(id));
  for (let i = 0; i < keys.length; i += 10) {
    await Promise.all(keys.slice(i, i + 10).map((Key) => r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key }))));
  }
  if (db) await db.from("galleries").delete().eq("id", id);
  if (to) {
    await sendEmail({
      to,
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
          const to = await getOwnerEmail(id);
          const sent =
            to &&
            (await sendEmail({
              to,
              subject: `Twoja galeria „${meta.title}” czeka na publikację`,
              html: emailLayout(
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

    if (!meta.expiresAt) continue;
    const expires = new Date(meta.expiresAt).getTime();
    const daysLeft = (expires - now) / DAY;
    const notices = { ...(meta.notices ?? {}) };
    const panelUrl = `${siteUrl()}/panel/galeria/${id}`;

    // 1. Przypomnienie: galeria wkrótce wygaśnie
    if (daysLeft > 0 && daysLeft <= REMIND_BEFORE && !notices.expiring) {
      log.push(`${id}: przypomnienie o wygaśnięciu`);
      if (!dry) {
        const to = await getOwnerEmail(id);
        const sent =
          to &&
          (await sendEmail({
            to,
            subject: `Galeria „${meta.title}” wygasa ${dateFmt.format(new Date(expires))}`,
            html: emailLayout(
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
          const to = await getOwnerEmail(id);
          const sent =
            to &&
            (await sendEmail({
              to,
              subject: `Zdjęcia z galerii „${meta.title}” zostaną usunięte ${dateFmt.format(deleteOn)}`,
              html: emailLayout(
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
