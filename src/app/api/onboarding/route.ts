import { getOnboarding, saveOnboarding } from "@/lib/onboarding";

export const runtime = "nodejs";

// Wyłączenie maili ze wskazówkami (link w stopce maila)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const uid = url.searchParams.get("u") ?? "";
  const token = url.searchParams.get("t") ?? "";
  let ok = false;
  if (/^[0-9a-f-]{36}$/i.test(uid) && /^[0-9a-f]{24}$/.test(token)) {
    const s = await getOnboarding(uid);
    if (s.token === token) {
      await saveOnboarding(uid, { ...s, off: new Date().toISOString() });
      ok = true;
    }
  }
  const msg = ok
    ? "Gotowe – nie będziemy już wysyłać wskazówek. Ważne wiadomości o Twoich galeriach i płatnościach nadal będą przychodzić. / Done – we won't send tips anymore."
    : "Nieprawidłowy link. / Invalid link.";
  return new Response(
    `<!doctype html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Lenslie</title></head><body style="font-family:Helvetica,Arial,sans-serif;background:#fdfcfa;color:#3b3633;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px;text-align:center"><div><p style="font-family:Georgia,serif;font-size:26px;margin:0 0 16px">Lenslie</p><p style="max-width:30em;line-height:1.6">${msg}</p></div></body></html>`,
    { status: ok ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}
