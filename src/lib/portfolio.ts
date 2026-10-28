import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, BUCKET } from "@/lib/r2";

// Mini-strona portfolio fotografa: /p/<adres>. Abonament przedpłacony (miesiąc albo rok) z salda lub Przelewy24.
export const PORTFOLIO_PRICES: Record<number, number> = { 1: 24, 12: 240 };
export const PORTFOLIO_MAX_PHOTOS = 40;

export type Service = { name: string; price: string; desc: string };
export type PortfolioSite = {
  uid: string;
  slug: string;
  title: string;
  tagline: string;
  about: string;
  city: string;
  phone: string;
  instagram: string;
  facebook: string;
  services: Service[];
  photos: string[]; // nazwy plików w portfolio/<uid>/photos/ – pierwsze jest okładką
  showBookings: boolean;
  dark: boolean;
  lang: "pl" | "en";
  consentAt?: string; // fotograf potwierdził zgody osób na zdjęciach
  paidUntil?: string;
  updatedAt: string;
};

const siteKey = (uid: string) => `portfolio/${uid}/site.json`;
const slugKey = (slug: string) => `portfolio-slugs/${slug}.json`;
export const photoKey = (uid: string, name: string) => `portfolio/${uid}/photos/${name}`;

async function getJson<T>(key: string): Promise<T | null> {
  try {
    const res = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    const text = await res.Body?.transformToString();
    return text ? (JSON.parse(text) as T) : null;
  } catch {
    return null;
  }
}
const putJson = (key: string, v: unknown) =>
  r2.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: JSON.stringify(v), ContentType: "application/json" }));

export const isSlug = (s: string) => /^[a-z0-9][a-z0-9-]{2,40}$/.test(s);
const RESERVED = new Set(["admin", "panel", "api", "lenslie", "www", "galeria", "goscie", "rezerwacja", "cennik", "regulamin"]);

export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export async function getSite(uid: string): Promise<PortfolioSite | null> {
  return getJson<PortfolioSite>(siteKey(uid));
}

export async function getSiteBySlug(slug: string): Promise<PortfolioSite | null> {
  if (!isSlug(slug)) return null;
  const ref = await getJson<{ uid: string }>(slugKey(slug));
  if (!ref) return null;
  const s = await getSite(ref.uid);
  return s && s.slug === slug ? s : null;
}

export function emptySite(uid: string, title: string, lang: "pl" | "en"): PortfolioSite {
  return {
    uid,
    slug: "",
    title,
    tagline: "",
    about: "",
    city: "",
    phone: "",
    instagram: "",
    facebook: "",
    services: [],
    photos: [],
    showBookings: true,
    dark: false,
    lang,
    updatedAt: new Date().toISOString(),
  };
}

export async function saveSite(s: PortfolioSite) {
  s.updatedAt = new Date().toISOString();
  await putJson(siteKey(s.uid), s);
}

// Zmiana adresu strony: false, gdy adres jest zajęty
export async function claimSlug(s: PortfolioSite, slug: string): Promise<boolean> {
  if (!isSlug(slug) || RESERVED.has(slug)) return false;
  const ref = await getJson<{ uid: string }>(slugKey(slug));
  if (ref && ref.uid !== s.uid) return false;
  if (s.slug && s.slug !== slug) await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: slugKey(s.slug) })).catch(() => undefined);
  await putJson(slugKey(slug), { uid: s.uid });
  s.slug = slug;
  return true;
}

export function portfolioActive(s: PortfolioSite | null) {
  return Boolean(s?.paidUntil && new Date(s.paidUntil).getTime() > Date.now());
}

export async function extendPortfolio(uid: string, months: number) {
  const s = (await getSite(uid)) ?? emptySite(uid, "", "pl");
  const base = s.paidUntil && new Date(s.paidUntil) > new Date() ? new Date(s.paidUntil) : new Date();
  base.setMonth(base.getMonth() + months);
  s.paidUntil = base.toISOString();
  await saveSite(s);
}

export async function photoUrls(s: PortfolioSite) {
  return Promise.all(
    s.photos.map(async (name) => ({
      name,
      url: await getSignedUrl(r2, new GetObjectCommand({ Bucket: BUCKET, Key: photoKey(s.uid, name) }), { expiresIn: 7200 }),
    })),
  );
}
