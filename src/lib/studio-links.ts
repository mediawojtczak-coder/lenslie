// Dodatkowy pasek kontaktu pod paskiem galerii – tylko dla wybranych kont (prezent od Lenslie)
export type StudioLinks = { facebook?: string; instagram?: string; phone?: string };

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l");

// Patrycja Kołodziej Fotografia
const PATRYCJA: StudioLinks = {
  facebook: "https://www.facebook.com/share/18w1Ksfs4B/",
  instagram: "https://www.instagram.com/patrycjakolodziejfotografia",
  phone: "539 094 737",
};

export function studioLinksFor(studioName: string | null | undefined): StudioLinks | null {
  if (!studioName) return null;
  const n = norm(studioName);
  if (n.includes("patrycja") && n.includes("kolodziej")) return PATRYCJA;
  return null;
}
