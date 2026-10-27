import { createClient } from "@supabase/supabase-js";

// Klient Supabase z kluczem serwisowym – tylko po stronie serwera.
// Używany tam, gdzie nie ma zalogowanego fotografa (klient galerii, zadania automatyczne, panel administratora).
// Zwraca null, dopóki w Vercelu nie ma zmiennej SUPABASE_SECRET_KEY.
export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function isAdminEmail(email?: string | null) {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}
