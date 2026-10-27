import { timingSafeEqual } from "crypto";

// Tymczasowa ochrona panelu jednym hasłem (do czasu kont fotografów)
export function isAdmin(password: unknown) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || typeof password !== "string") return false;
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
