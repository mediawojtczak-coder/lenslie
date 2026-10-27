import { createBrowserClient } from "@supabase/ssr";

// Klient Supabase w przeglądarce (używany przy logowaniu)
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
  );
}
