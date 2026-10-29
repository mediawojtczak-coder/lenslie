import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { r2, BUCKET } from "@/lib/r2";

// Motywy galerii klienta. Klasyczny jest darmowy, premium kupuje się raz na konto i używa w każdej galerii.
export type ThemeId = "classic" | "noir" | "minimal" | "rustic";
export type Theme = { id: ThemeId; name: string; nameEn: string; desc: string; descEn: string; price: number; swatch: [string, string, string] };

export const THEMES: Theme[] = [
  { id: "classic", name: "Klasyczny", nameEn: "Classic", desc: "Jasny, pudrowy – domyślny", descEn: "Light and powdery – default", price: 0, swatch: ["#fdfcfa", "#3b3633", "#f4e8e3"] },
  { id: "noir", name: "Czarny elegancki", nameEn: "Noir", desc: "Ciemne tło, zdjęcia jak w galerii sztuki", descEn: "Dark background, photos like in an art gallery", price: 19, swatch: ["#131110", "#f2ede8", "#c9a87c"] },
  { id: "minimal", name: "Minimalistyczny", nameEn: "Minimal", desc: "Czysta biel, proste litery, nic poza zdjęciami", descEn: "Pure white, simple type, nothing but photos", price: 19, swatch: ["#ffffff", "#111111", "#ececec"] },
  { id: "rustic", name: "Rustykalny ślubny", nameEn: "Rustic wedding", desc: "Kremowy papier, odręczne litery, szałwia", descEn: "Cream paper, handwritten type, sage", price: 19, swatch: ["#f5eee3", "#4a3b2e", "#a9b39a"] },
];

export const isThemeId = (v: unknown): v is ThemeId => THEMES.some((t) => t.id === v);
export const getTheme = (id?: string) => THEMES.find((t) => t.id === id) ?? THEMES[0];

const key = (uid: string) => `profiles/${uid}/themes.json`;

export async function getOwnedThemes(uid: string): Promise<ThemeId[]> {
  try {
    const res = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key(uid) }));
    const owned = JSON.parse((await res.Body?.transformToString()) ?? "{}").owned;
    return Array.isArray(owned) ? owned.filter(isThemeId) : [];
  } catch {
    return [];
  }
}

export async function addOwnedTheme(uid: string, id: ThemeId) {
  const owned = await getOwnedThemes(uid);
  if (owned.includes(id)) return;
  await r2.send(new PutObjectCommand({ Bucket: BUCKET, Key: key(uid), Body: JSON.stringify({ owned: [...owned, id] }), ContentType: "application/json" }));
}

export async function ownsTheme(uid: string, id: ThemeId) {
  if (getTheme(id).price === 0 || (await getOwnedThemes(uid)).includes(id)) return true;
  // abonament Pro: wszystkie motywy w cenie
  const { activePro } = await import("@/lib/pro");
  return Boolean(await activePro(uid));
}
