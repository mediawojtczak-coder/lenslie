// Miniaturka przy udostępnianiu linku (Facebook, Messenger, WhatsApp, X) – opis w języku strony
export const ogImage = (lang: "pl" | "en") => ({
  url: lang === "en" ? "/og-lenslie-en.jpg" : "/og-lenslie.jpg",
  width: 1200,
  height: 630,
  alt: lang === "en" ? "Lenslie – online photo galleries for photographers" : "Lenslie – galerie zdjęć online dla fotografów",
});
