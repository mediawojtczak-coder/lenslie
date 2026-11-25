// Artykuły w sekcji „Poradnik” – jedna lista dla strony /poradnik, mapy strony i linków
export type Guide = {
  slug: string;
  title: [string, string]; // [PL, EN]
  excerpt: [string, string];
  published: string; // RRRR-MM-DD
};

export const GUIDES: Guide[] = [
  {
    slug: "jak-przekazac-zdjecia-klientowi",
    title: [
      "Jak przekazać zdjęcia klientowi – WeTransfer, Dysk Google czy galeria online?",
      "How to deliver photos to clients – WeTransfer, Google Drive or an online gallery?",
    ],
    excerpt: [
      "Porównanie najpopularniejszych sposobów oddawania sesji: limity, wygoda klienta, wybór zdjęć i to, jak wygląda Twoja praca w oczach klienta.",
      "A comparison of the most popular ways to deliver a session: limits, client convenience, photo proofing and how your work looks to the client.",
    ],
    published: "2026-11-25",
  },
];
