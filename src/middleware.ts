import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SRC_COOKIE, touchFrom } from "@/lib/source-touch";
import { toEn, fromEn, isSitePath } from "@/lib/en-paths";

const MAIN_HOSTS = new Set(["lenslie.com", "www.lenslie.com", "lenslie.vercel.app", "localhost"]);
const MARKETING = /^\/($|cennik|funkcje(\/|$)|rejestracja|logowanie|regulamin|polityka-prywatnosci)/;
const SESSION_PATHS = ["/panel", "/admin", "/logowanie", "/api/upload-url", "/api/galleries", "/api/profile", "/api/domain", "/api/wallet", "/api/bookings", "/api/guest-events", "/api/portfolio", "/api/stripe-connect"];

export async function middleware(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();
  const path = request.nextUrl.pathname;

  // Adres techniczny lenslie.vercel.app → www.lenslie.com (tylko strony, nie API)
  if (host === "lenslie.vercel.app" && (request.method === "GET" || request.method === "HEAD") && !path.startsWith("/api/")) {
    const url = new URL(request.nextUrl.pathname + request.nextUrl.search, "https://www.lenslie.com");
    return NextResponse.redirect(url, 308);
  }

  // Własna domena fotografa: galerie pod jego adresem (API i pliki strony działają bez zmian)
  if (host && !MAIN_HOSTS.has(host) && !host.endsWith(".vercel.app")) {
    if (path.startsWith("/api/") || path.startsWith("/_next/") || path.includes(".")) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = `/domena/${host}${path === "/" ? "" : path}`;
    return NextResponse.rewrite(url);
  }

  // Wersja angielska pod osobnym adresem z angielskimi słowami (lenslie.com/en, /en/pricing, /en/features/photo-sales…)
  // – potrzebne m.in. do podglądów linków na Instagramie/Facebooku i dla Google; ?lang=en|pl wymusza język
  const isPage = (request.method === "GET" || request.method === "HEAD") && !path.startsWith("/api/") && !path.startsWith("/_next/") && !path.includes(".");
  const enPath = path === "/en" || path.startsWith("/en/");
  const qLang = request.nextUrl.searchParams.get("lang");
  const setLangCookie = (res: NextResponse, l: string) => {
    res.cookies.set("lenslie_lang", l, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    return res;
  };
  if (isPage && enPath && qLang === "pl") {
    const back = request.nextUrl.clone();
    back.pathname = fromEn(path);
    back.searchParams.delete("lang");
    return setLangCookie(NextResponse.redirect(back, 307), "pl");
  }
  if (isPage && enPath) {
    const headers = new Headers(request.headers);
    headers.set("x-lenslie-lang", "en");
    const target = request.nextUrl.clone();
    target.pathname = fromEn(path);
    const res = setLangCookie(NextResponse.rewrite(target, { request: { headers } }), "en");
    const t = MARKETING.test(target.pathname) ? touchFrom(request.nextUrl, request.headers.get("referer")) : null;
    if (t) res.cookies.set(SRC_COOKIE, encodeURIComponent(JSON.stringify(t)), { path: "/", sameSite: "lax", httpOnly: true, secure: true });
    return res;
  }
  // Anglojęzyczny gość na polskim adresie strony informacyjnej → ten sam adres po angielsku (/cennik → /en/pricing)
  // (bez robotów Google i podglądów linków – one dostają adres, o który pytają)
  const bot = /bot|crawl|spider|facebookexternalhit|facebookcatalog|instagram|whatsapp|telegram|slack|discord|linkedin|embedly|preview/i.test(request.headers.get("user-agent") ?? "");
  if (isPage && !bot && isSitePath(path) && qLang !== "pl") {
    const cookie = request.cookies.get("lenslie_lang")?.value;
    const accept = (request.headers.get("accept-language") ?? "").toLowerCase();
    const browserEn = Boolean(accept) && !(accept.startsWith("pl") || /(^|,)\s*pl/.test(accept.split(";")[0]));
    const wantsEn = qLang === "en" || cookie === "en" || (!cookie && browserEn);
    if (wantsEn) {
      const to = request.nextUrl.clone();
      to.pathname = toEn(path);
      to.searchParams.delete("lang");
      return setLangCookie(NextResponse.redirect(to, 307), "en");
    }
  }
  if (isPage && (qLang === "en" || qLang === "pl")) {
    const forced = qLang as string;
    const headers = new Headers(request.headers);
    headers.set("x-lenslie-lang", forced);
    return setLangCookie(NextResponse.next({ request: { headers } }), forced);
  }

  // Źródło wizyty na stronach Lenslie (nie w galeriach klientów): reklama, polecenie, wyszukiwarka – zapisywane przy rejestracji
  const touch = MARKETING.test(path) ? touchFrom(request.nextUrl, request.headers.get("referer")) : null;
  const withSrc = (res: NextResponse) => {
    if (touch) res.cookies.set(SRC_COOKIE, encodeURIComponent(JSON.stringify(touch)), { path: "/", sameSite: "lax", httpOnly: true, secure: true });
    return res;
  };

  if (!SESSION_PATHS.some((p) => path === p || path.startsWith(`${p}/`))) return withSrc(NextResponse.next());

  // Odświeża sesję zalogowanego fotografa
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return withSrc(response);

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  await supabase.auth.getUser();
  return withSrc(response);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
