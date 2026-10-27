import Link from "next/link";
import SideLogout from "@/components/SideLogout";
import { getUser } from "@/lib/supabase/server";
import { logoUrl } from "@/lib/profiles";
import AccountForms from "./AccountForms";
import { getBilling } from "@/lib/billing";

export const dynamic = "force-dynamic";

// Konto fotografa: nazwa studia i logo widoczne w galeriach klientów, zmiana hasła
export default async function Konto({ searchParams }: { searchParams: Promise<{ "nowe-haslo"?: string }> }) {
  const sp = await searchParams;
  const { supabase, user } = await getUser();
  const { data, error } = await supabase.from("profiles").select("studio_name, logo_key").eq("id", user!.id).maybeSingle();
  const profile = (data ?? null) as { studio_name: string | null; logo_key: string | null } | null;

  return (
    <div className="app-body">
      <aside className="app-side">
        <Link href="/panel" className="link-quiet back-link">← Wszystkie galerie</Link>
        <nav aria-label="Konto">
          <span className="side-link active">Moje konto</span>
        </nav>
        <SideLogout />
      </aside>
      <main className="app-main">
        <div className="settings">
          {sp["nowe-haslo"] && <p className="warn-inline">Ustaw nowe hasło w sekcji „Logowanie” poniżej.</p>}
          {error && (
            <p className="warn-inline">
              Profil nie jest jeszcze gotowy: w Supabase trzeba uruchomić SQL z tabelą „profiles”.
            </p>
          )}
          <AccountForms
            email={user!.email ?? ""}
            studioName={profile?.studio_name ?? ""}
            logoUrl={await logoUrl(profile?.logo_key)}
            billing={await getBilling(user!.id)}
          />
        </div>
      </main>
    </div>
  );
}
