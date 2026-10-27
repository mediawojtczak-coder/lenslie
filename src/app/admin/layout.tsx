import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

// Panel administratora – tylko dla adresów z ADMIN_EMAILS
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await getUser();
  if (!user) redirect("/logowanie");
  if (!isAdminEmail(user.email)) notFound();

  return (
    <div className="app">
      <header className="app-bar">
        <Link href="/admin" className="wordmark">
          Lenslie <span className="admin-tag">admin</span>
        </Link>
        <span />
        <Link href="/panel" className="link-quiet">
          Mój panel
        </Link>
      </header>
      {children}
    </div>
  );
}
