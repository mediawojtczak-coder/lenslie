import { S3Client } from "@aws-sdk/client-s3";

// Połączenie z Cloudflare R2 (zgodne z S3). Klucze pochodzą z ustawień Vercel.
export const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  },
  // R2 nie obsługuje dodatkowych sum kontrolnych dodawanych domyślnie przez nowsze SDK
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

export const BUCKET = process.env.R2_BUCKET ?? "lenslie";

// Adres galerii: małe litery, cyfry i myślniki, np. "anna-i-marek"
export function isValidGalleryId(id: string) {
  return /^[a-z0-9][a-z0-9-]{0,59}$/.test(id);
}

// Bezpieczna nazwa pliku: bez ścieżek i dziwnych znaków
export function safeFileName(name: string) {
  const base = name.split(/[\\/]/).pop() ?? "zdjecie";
  const cleaned = base
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
  return cleaned || "zdjecie";
}

export function baseName(fileName: string) {
  const i = fileName.lastIndexOf(".");
  return i > 0 ? fileName.slice(0, i) : fileName;
}

export const galleryPrefix = (id: string) => `galleries/${id}/`;
