import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { r2, BUCKET } from "@/lib/r2";
import { listObjects } from "@/lib/photos";
import { formatBytes } from "@/lib/plans";

// Przypomnienia dla właściciela serwisu: rzeczy, które trzeba zmienić, gdy Lenslie rośnie
export type Reminder = { id: string; level: "pilne" | "wkrótce" | "info"; title: string; text: string };

const TB = 1024 ** 4;
const GB = 1024 ** 3;

export async function getReminders(): Promise<Reminder[]> {
  const out: Reminder[] = [];
  const objs = await listObjects("").catch(() => []);
  const total = objs.reduce((s, o) => s + o.size, 0);
  const now = new Date();

  if (process.env.HOSTING !== "cloudflare" && process.env.VERCEL_PLAN !== "pro") {
    out.push({
      id: "vercel-hobby",
      level: "pilne",
      title: "Hosting: plan Vercel Hobby jest niekomercyjny",
      text: "Lenslie przyjmuje płatności, a darmowy plan Vercel jest tylko do użytku niekomercyjnego. Przenieś stronę na Cloudflare Workers (ok. 5 USD/mies.) albo przejdź na Vercel Pro (20 USD/mies.). Po przejściu dodaj w Vercelu zmienną VERCEL_PLAN=pro albo HOSTING=cloudflare, żeby wyłączyć to przypomnienie.",
    });
  }
  if (total > TB) {
    out.push({
      id: "storage-1tb",
      level: "wkrótce",
      title: `Magazyn: ${formatBytes(total)} – czas na tańszy magazyn`,
      text: "R2 kosztuje ok. 60 zł/mies. za każdy 1 TB. Przy tej skali przejście na Hetzner Object Storage lub Backblaze B2 obniży koszt 2–3 razy. Sprawdź wtedy opłaty za pobieranie (ZIP-y klientów).",
    });
  } else if (total > 8 * GB) {
    out.push({
      id: "storage-free",
      level: "info",
      title: `Magazyn: ${formatBytes(total)} – kończy się darmowe 10 GB w R2`,
      text: "Powyżej 10 GB R2 zaczyna naliczać ok. 0,06 zł za GB miesięcznie. To normalne i opłacane z pakietów – tylko informacja.",
    });
  }
  if (now >= new Date("2026-12-27") && now < new Date("2027-10-20")) {
    out.push({
      id: "domain-transfer",
      level: "info",
      title: "Domena: przenieś lenslie.com z home.pl do Cloudflare",
      text: "Odnowienie w home.pl kosztuje ok. 221 zł/rok, w Cloudflare ok. 45 zł. Przeniesienie jest już możliwe (minęło 60 dni od rejestracji); zrób to przed 27 października 2027.",
    });
  }
  if (process.env.P24_LENSLIE_SHOP !== "1") {
    out.push({
      id: "p24-shop",
      level: "wkrótce",
      title: "Płatności: sklep lenslie.com w Przelewy24",
      text: "Płatności idą przez sklep fotoexpres.pl – klient widzi tę nazwę w banku, a umowa z P24 dotyczy tamtej strony. Zgłoś sklep lenslie.com; po aktywacji podmień P24_POS_ID (i klucze, jeśli inne) i dodaj zmienną P24_LENSLIE_SHOP=1.",
    });
  }
  return out;
}

// Raz w tygodniu wysyłamy przypomnienia mailem (zapis ostatniej wysyłki w magazynie)
const stateKey = "system/reminders.json";
export async function lastReminderMail(): Promise<string | null> {
  try {
    const res = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: stateKey }));
    return (JSON.parse((await res.Body?.transformToString()) ?? "{}") as { sentAt?: string }).sentAt ?? null;
  } catch {
    return null;
  }
}
export async function markReminderMail() {
  await r2.send(
    new PutObjectCommand({ Bucket: BUCKET, Key: stateKey, Body: JSON.stringify({ sentAt: new Date().toISOString() }), ContentType: "application/json" }),
  );
}
