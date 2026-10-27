import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Wspólna rama panelu fotografa: górny pasek z wyszukiwarką i kontem
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { user } = await getUser();
  if (!user) redirect("/logowanie");

  const initial = (user.email ?? "?").charAt(0).toUpperCase();

  return (
    <div className="app">
      <header className="app-bar">
        <Link href="/panel" className="wordmark">Lenslie</Link>

        <form className="app-search" action="/panel" role="search">
          <label htmlFor="q" className="sr-only">Szukaj galerii</label>
          <input id="q" name="q" type="search" placeholder="Szukaj galerii lub klienta" />
        </form>

        <details className="account">
          <summary aria-label="Konto">
            <span className="avatar">{initial}</span>
          </summary>
          <div className="account-menu">
            <p>{user.email}</p>
            <form method="post" action="/auth/wyloguj">
              <button type="submit">Wyloguj</button>
            </form>
          </div>
        </details>
      </header>
      {children}
    </div>
  );
}
