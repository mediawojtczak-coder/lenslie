// Logowanie i rejestracja przez Google (Supabase OAuth).
// Przycisk pokazujemy dopiero, gdy dostawca Google jest włączony w Supabase – do tego czasu strona wygląda jak dotąd.

let cache: { on: boolean; at: number } | null = null;

export async function googleLoginEnabled(): Promise<boolean> {
  if (cache && Date.now() - cache.at < 5 * 60 * 1000) return cache.on;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  let on = false;
  if (url && key) {
    try {
      const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key }, cache: "no-store" });
      const s = (await res.json()) as { external?: { google?: boolean } };
      on = Boolean(s?.external?.google);
    } catch {
      on = false;
    }
  }
  cache = { on, at: Date.now() };
  return on;
}

// Ciasteczko na czas przejścia przez Google: kod polecenia (link polecający musi przetrwać przekierowanie)
export const OAUTH_COOKIE = "lenslie_oauth";
