// Dodatkowy pasek kontaktu pod paskiem galerii – tylko dla wybranych kont (prezent od Lenslie)
export type StudioLinks = { facebook?: string; instagram?: string; phone?: string };

// Konta z paskiem kontaktu (e-mail konta → linki)
const LINKS: Record<string, StudioLinks> = {
  // Patrycja Kołodziej Fotografia
  "fotografiapatrycja.k@gmail.com": {
    facebook: "https://www.facebook.com/share/18w1Ksfs4B/",
    instagram: "https://www.instagram.com/patrycjakolodziejfotografia",
    phone: "539 094 737",
  },
  // FotoMR Mateusz Rachwalski
  "mateuszrachwalski@interia.eu": {
    facebook: "https://www.facebook.com/fotomrostrow",
    instagram: "https://www.instagram.com/fotomrostrow",
    phone: "500 177 125",
  },
};

// po e-mailu konta fotografa
export const studioLinksFor = (email: string | null | undefined) => (email ? (LINKS[email.trim().toLowerCase()] ?? null) : null);
