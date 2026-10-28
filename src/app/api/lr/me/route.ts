import { lrUser, lrError, LR_PLUGIN_VERSION } from "@/lib/lr";

export const runtime = "nodejs";

// Sprawdzenie klucza wtyczki (czy nadal zalogowana) i najnowszej wersji wtyczki
export async function GET(req: Request) {
  const user = await lrUser(req);
  if (!user) return lrError(req.headers.get("accept-language")?.startsWith("en") ? "en" : "pl", "Zaloguj się ponownie we wtyczce.", "Sign in again in the plugin.", 401);
  return Response.json({ email: user.email, version: LR_PLUGIN_VERSION });
}
