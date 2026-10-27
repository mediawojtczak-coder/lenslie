import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const MAIN_HOSTS = new Set(["lenslie.com", "www.lenslie.com", "lenslie.vercel.app", "localhost"]);
const SESSION_PATHS = ["/panel", "/admin", "/logowanie", "/api/upload-url", "/api/galleries", "/api/profile", "/api/domain", "/api/wallet", "/api/bookings"];

export async function middleware(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();
  const path = request.nextUrl.pathname;

  // Własna domena fotografa: galerie pod jego adresem (API i pliki strony działają bez zmian)
  if (host && !MAIN_HOSTS.has(host) && !host.endsWith(".vercel.app")) {
    if (path.startsWith("/api/") || path.startsWith("/_next/") || path.includes(".")) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = `/domena/${host}${path === "/" ? "" : path}`;
    return NextResponse.rewrite(url);
  }

  if (!SESSION_PATHS.some((p) => path === p || path.startsWith(`${p}/`))) return NextResponse.next();

  // Odświeża sesję zalogowanego fotografa
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;

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
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
