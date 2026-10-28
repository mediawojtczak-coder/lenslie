import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { r2, BUCKET, galleryPrefix } from "@/lib/r2";
import type { Period, PlanId } from "@/lib/plans";
import type { Sale } from "@/lib/sales";
import type { Video } from "@/lib/videos";
import type { ThemeId } from "@/lib/themes";

// Opis galerii zapisany obok zdjęć w R2: galleries/<id>/meta.json
export type GalleryMeta = {
  title: string;
  passwordHash?: string;
  // Hasło do udostępnienia klientowi (widoczne tylko dla fotografa w panelu)
  password?: string;
  createdAt: string;
  layout?: "mozaika" | "siatka";
  // Pakiet: rozmiar, okres publikacji i data wygaśnięcia dostępu dla klienta
  plan?: PlanId;
  period?: Period;
  expiresAt?: string;
  // Zdjęcie główne (okładka) – nazwa zdjęcia bez rozszerzenia; brak = pierwsze zdjęcie
  cover?: string;
  // Data wydarzenia (RRRR-MM-DD) i wiadomość powitalna dla klienta
  eventDate?: string;
  welcome?: string;
  // Sekcje (np. Ceremonia, Wesele) i przypisanie zdjęć do sekcji
  sections?: Section[];
  photoSection?: Record<string, string>;
  // Własna kolejność zdjęć ustawiona przez fotografa
  order?: string[];
  // Muzyka do pokazu slajdów (galleries/<id>/music.mp3)
  music?: boolean;
  // Co klient może pobrać: wszystko, tylko wersje do internetu albo nic
  downloads?: Downloads;
  // Znak wodny na zdjęciach w galerii klienta (galleries/<id>/wm/)
  watermark?: { enabled: boolean; text: string };
  // Osobny link dla gości wesela
  guest?: GuestLink;
  // Sprzedaż zdjęć: pakiet w cenie sesji i dopłata za dodatkowe zdjęcia
  sale?: Sale;
  // Limit wyboru ulubionych (np. 60 zdjęć do albumu)
  pickLimit?: { max: number; label: string };
  // Filmy (oryginały w videos/<id>/, podgląd w Cloudflare Stream) – wyświetlane na górze galerii
  videos?: Video[];
  // Motyw galerii klienta (premium kupowane raz na konto)
  theme?: ThemeId;
  // „Znajdź siebie na zdjęciach”: opłacone, włączone, zgoda fotografa, liczba zindeksowanych zdjęć
  faces?: { enabled: boolean; paid?: boolean; consentAt?: string; indexed?: number };
  // Wysłane automatyczne powiadomienia (daty), czyszczone po przedłużeniu
  // Język galerii widzianej przez klienta
  lang?: "pl" | "en";
  notices?: { expiring?: string; deleting?: string; draft?: string };
};

export type Downloads = "all" | "web" | "none";
export type GuestLink = { enabled: boolean; token: string; sections: string[]; downloads: "web" | "none" };

export function watermarkOn(meta: GalleryMeta | null) {
  return Boolean(meta?.watermark?.enabled && meta.watermark.text.trim());
}

export type Section = { id: string; name: string };

export function isExpired(meta: GalleryMeta | null) {
  return Boolean(meta?.expiresAt && new Date(meta.expiresAt).getTime() < Date.now());
}

const metaKey = (id: string) => `${galleryPrefix(id)}meta.json`;

export async function getMeta(id: string): Promise<GalleryMeta | null> {
  if (!process.env.R2_ENDPOINT) return null;
  try {
    const res = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: metaKey(id) }));
    const text = await res.Body?.transformToString();
    return text ? (JSON.parse(text) as GalleryMeta) : null;
  } catch (err) {
    const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (e.name === "NoSuchKey" || e.$metadata?.httpStatusCode === 404) return null;
    throw err;
  }
}

export async function saveMeta(id: string, meta: GalleryMeta) {
  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: metaKey(id),
      Body: JSON.stringify(meta),
      ContentType: "application/json",
    }),
  );
}

// Hasła zapisujemy tylko jako skrót (scrypt), nigdy wprost
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// Ciasteczko dostępu: podpis zależny od galerii i jej hasła.
// Zmiana hasła automatycznie unieważnia wcześniejsze dostępy.
function secret() {
  return process.env.SESSION_SECRET || process.env.R2_SECRET_ACCESS_KEY || "";
}

export const accessCookieName = (id: string) => `lg_${id}`;

export function accessToken(id: string, meta: GalleryMeta) {
  return createHmac("sha256", secret())
    .update(`${id}:${meta.passwordHash ?? ""}`)
    .digest("base64url");
}

export function hasAccess(id: string, meta: GalleryMeta | null, cookieValue?: string) {
  if (!meta?.passwordHash) return true;
  if (!cookieValue) return false;
  const expected = Buffer.from(accessToken(id, meta));
  const actual = Buffer.from(cookieValue);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

// Wersje robocze (nieopublikowane): przypomnienie po 10 dniach, usunięcie po 20 dniach od utworzenia
export const DRAFT_REMIND_DAYS = 10;
export const DRAFT_DELETE_DAYS = 20;
export function draftDeleteDate(meta: GalleryMeta) {
  return new Date(new Date(meta.createdAt).getTime() + DRAFT_DELETE_DAYS * 24 * 3600 * 1000);
}
