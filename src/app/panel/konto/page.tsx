import Link from "next/link";
import SideLogout from "@/components/SideLogout";
import { getUser } from "@/lib/supabase/server";
import { logoUrl } from "@/lib/profiles";
import AccountForms from "./AccountForms";
import { getBilling } from "@/lib/billing";
import { getWallet, TOPUPS } from "@/lib/wallet";
import { getOrder } from "@/lib/p24";
import WalletCard from "./WalletCard";
import ReferralCard from "./ReferralCard";
import DomainCard from "./DomainCard";
import { getDomainByUser, domainActive, DOMAIN_PRICE, vercelEnabled } from "@/lib/domains";
import { getRefUser, REWARD, THRESHOLD } from "@/lib/referrals";
import { siteUrl } from "@/lib/email";
import RefreshSoon from "../galeria/[id]/RefreshSoon";

export const dynamic = "force-dynamic";

// Konto fotografa: nazwa studia i logo widoczne w galeriach klientów, zmiana hasła
export default async function Konto({ searchParams }: { searchParams: Promise<{ "nowe-haslo"?: string; platnosc?: string }> }) {
  const sp = await searchParams;
  const { supabase, user } = await getUser();
  const { data, error } = await supabase.from("profiles").select("studio_name, logo_key").eq("id", user!.id).maybeSingle();
  const [wallet, billing, refUser] = await Promise.all([
    getWallet(user!.id),
    getBilling(user!.id),
    getRefUser(user!.id).catch(() => null),
  ]);
  const domainRec = await getDomainByUser(user!.id).catch(() => null);
  const order = sp.platnosc ? await getOrder(sp.platnosc) : null;
  const payment = order && order.ownerId === user!.id ? order : null;
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
          {payment && payment.status === "paid" && (
            <p className="success-box">Doładowanie przyjęte. Dziękujemy!</p>
          )}
          {payment && payment.status !== "paid" && (
            <p className="warn-inline">
              Czekamy na potwierdzenie płatności od Przelewy24. Strona odświeży się sama.
              <RefreshSoon />
            </p>
          )}
          <WalletCard balance={wallet.balance} history={wallet.history} billing={billing} topups={TOPUPS} />
          <DomainCard
            rec={domainRec ? { host: domainRec.host, paidUntil: domainRec.paidUntil } : null}
            active={domainActive(domainRec)}
            price={DOMAIN_PRICE}
            balance={wallet.balance}
            enabled={vercelEnabled()}
          />
          {refUser && (
            <ReferralCard
              link={`${siteUrl()}/rejestracja?polecenie=${refUser.code}`}
              invited={refUser.invited}
              reward={REWARD}
              threshold={THRESHOLD}
            />
          )}
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
            billing={billing}
          />
        </div>
      </main>
    </div>
  );
}
