"use client";

import { useState } from "react";
import { useLang } from "@/components/LangProvider";
import { tr, money, locale } from "@/lib/lang";

type Invite = { email: string; at: string; paid: number; rewarded: boolean };

// Program poleceń: link do udostępnienia i lista poleconych fotografów
export default function ReferralCard({
  link,
  invited,
  reward,
  threshold,
}: {
  link: string;
  invited: Invite[];
  reward: number;
  threshold: number;
}) {
  const lang = useLang();
  const t = (pl: string, en: string) => tr(lang, pl, en);
  const z = (n: number) => money(n, lang);
  const dateFmt = new Intl.DateTimeFormat(locale(lang), { day: "numeric", month: "short", year: "numeric" });
  const [copied, setCopied] = useState(false);
  const earned = invited.filter((i) => i.rewarded).length * reward;

  async function copy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="settings-card" id="polecenia">
      <h2>{t("Poleć Lenslie", "Recommend Lenslie")}</h2>
      <p>
        {lang === "en" ? (
          <>Send the link to a photographer friend. When they sign up and pay {z(threshold)} in total, <strong>you both get {z(reward)}</strong> on your balance.</>
        ) : (
          <>Wyślij link znajomemu fotografowi. Gdy założy konto i wpłaci łącznie {threshold} zł, <strong>oboje dostajecie po {reward} zł</strong> na saldo.</>
        )}
      </p>
      <div className="copy-row guest-link">
        <span className="share-url">{link}</span>
        <button type="button" className="btn btn-ghost btn-small" onClick={copy}>
          {copied ? t("Skopiowano", "Copied") : t("Kopiuj link", "Copy link")}
        </button>
      </div>
      {invited.length > 0 && (
        <>
          <p className="field-title">
            {t("Poleceni fotografowie", "Referred photographers")}: {invited.length} · {t("zarobione", "earned")}: {z(earned)}
          </p>
          <ul className="wallet-history">
            {invited.map((i, n) => (
              <li key={n}>
                <div>
                  <span>{i.email}</span>
                  <small>{t("od", "since")} {dateFmt.format(new Date(i.at))}</small>
                </div>
                <strong className={i.rewarded ? "plus" : "minus"}>
                  {i.rewarded ? `+${z(reward)}` : `${t("wpłacił", "paid")} ${(i.paid / 100).toFixed(0)} ${t("z", "of")} ${z(threshold)}`}
                </strong>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
