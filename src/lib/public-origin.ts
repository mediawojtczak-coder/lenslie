// Adres, który wysyłamy klientom: zawsze www.lenslie.com (także gdy panel otwarto pod adresem technicznym *.vercel.app)
export const PUBLIC_ORIGIN = "https://www.lenslie.com";

export function publicOrigin() {
  if (typeof window === "undefined") return PUBLIC_ORIGIN;
  const o = window.location.origin;
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o) ? o : PUBLIC_ORIGIN;
}
