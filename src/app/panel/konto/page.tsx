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
import PayoutCard from "./PayoutCard";
import { getPayout } from "@/lib/sales";
import { getDomainByUser, domainActive, DOMAIN_PRICE, vercelEnabled } from "@/lib/domains";
import { getRefUser, REWARD, THRESHOLD } from "@/lib/referrals";
import { siteUrl } from "@/lib/email";
import RefreshSoon from "../galeria/[id]/RefreshSoon";
import { getLang } from "@/lib/lang-server";
import { tr } from "@/lib/lang";

export const dynamic = "force-dynamic";

// Konto fotografa: nazwa studia i logo widoczne w galeriach klientów, zmiana hasła
export default async function Konto({ searchParams }: { searchParams: Promise<{ "nowe-haslo"?: string; platnosc?: string }> }) {
  const sp = await searchParams;
  const lang = await getLang();
  const t = (pl: string, en: string) => tr(lang, pl, en);
  const { supabase, user } = await getUser();
  const { data, error } = await supabase.from("profiles").select("studio_name, logo_key").eq("id", user!.id).maybeSingle();
  const [wallet, billing, refUser] = await Promise.all([
    getWallet(user!.id),
    getBilling(user!.id),
    getRefUser(user!.id).catch(() => null),
  ]);
  const domainRec = await getDomainByUser(user!.id).catch(() => null);
  const payout = await getPayout(user!.id).catch(() => null);
  const order = sp.platnosc ? await getOrder(sp.platnosc) : null;
  const payment = order && order.ownerId === user!.id ? order : null;
  const profile = (data ?? null) as { studio_name: string | null; logo_key: string | null } | null;

  return (
    <div className="app-body">
      <aside className="app-side">
        <Link href="/panel" className="link-quiet back-link">← {t("Wszystkie galerie", "All galleries")}</Link>
        <nav aria-label={t("Konto", "Account")}>
          <span className="side-link active">{t("Moje konto", "My account")}</span>
        </nav>
        <SideLogout />
      </aside>
      <main className="app-main">
        <div className="settings">
          {payment && payment.status === "paid" && (
            <p className="success-box">{t("Doładowanie przyjęte. Dziękujemy!", "Top-up received. Thank you!")}</p>
          )}
          {payment && payment.status !== "paid" && (
            <p className="warn-inline">
              {t("Czekamy na potwierdzenie płatności od Przelewy24. Strona odświeży się sama.", "Waiting for payment confirmation from Przelewy24. The page refreshes by itself.")}
              <RefreshSoon />
            </p>
          )}
          <WalletCard balance={wallet.balance} history={wallet.history} billing={billing} topups={TOPUPS} />
          <PayoutCard payout={payout} />
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
          {sp["nowe-haslo"] && <p className="warn-inline">{t("Ustaw nowe hasło w sekcji „Logowanie” poniżej.", "Set a new password in the “Sign-in” section below.")}</p>}
          {error && (
            <p className="warn-inline">
              {t("Profil nie jest jeszcze gotowy.", "Your profile is not ready yet.")}
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
