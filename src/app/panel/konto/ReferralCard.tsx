"use client";

import { useState } from "react";

type Invite = { email: string; at: string; paid: number; rewarded: boolean };
const dateFmt = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "short", year: "numeric" });

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
  const [copied, setCopied] = useState(false);
  const earned = invited.filter((i) => i.rewarded).length * reward;

  async function copy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="settings-card" id="polecenia">
      <h2>Poleć Lenslie</h2>
      <p>
        Wyślij link znajomemu fotografowi. Gdy założy konto i wpłaci łącznie {threshold} zł, <strong>oboje dostajecie po {reward} zł</strong> na saldo.
      </p>
      <div className="copy-row guest-link">
        <span className="share-url">{link}</span>
        <button type="button" className="btn btn-ghost btn-small" onClick={copy}>
          {copied ? "Skopiowano" : "Kopiuj link"}
        </button>
      </div>
      {invited.length > 0 && (
        <>
          <p className="field-title">
            Poleceni fotografowie: {invited.length} · zarobione: {earned} zł
          </p>
          <ul className="wallet-history">
            {invited.map((i, n) => (
              <li key={n}>
                <div>
                  <span>{i.email}</span>
                  <small>od {dateFmt.format(new Date(i.at))}</small>
                </div>
                <strong className={i.rewarded ? "plus" : "minus"}>
                  {i.rewarded ? `+${reward} zł` : `wpłacił ${(i.paid / 100).toFixed(0)} z ${threshold} zł`}
                </strong>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
