import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

// Klient Supabase po stronie serwera, działający w imieniu zalogowanego fotografa
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Wywołane z komponentu serwerowego: odświeżaniem sesji zajmuje się middleware
          }
        },
      },
    },
  );
}

// Zwraca zalogowanego fotografa albo null.
// cache(): w ramach jednego wyświetlenia strony (ramka panelu + strona) sprawdzamy sesję w Supabase tylko raz.
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
});
