"use client";

import { useState } from "react";
import InvoiceFields from "@/components/InvoiceFields";
import type { Billing } from "@/lib/billing";
import type { WalletEntry } from "@/lib/wallet";
import { useLang } from "@/components/LangProvider";
import { tr, money, locale } from "@/lib/lang";


// Opisy operacji są zapisywane po polsku – w wersji angielskiej tłumaczymy znane wzory
const PLAN_EN: Record<string, string> = { "Mała": "Small", "Średnia": "Medium", "Duża": "Large" };
const RULES: [RegExp, (...m: string[]) => string][] = [
  [/^Doładowanie konta \(Przelewy24\)$/, () => "Account top-up (Przelewy24)"],
  [/^Bonus do doładowania (\d+) zł$/, (a) => `Top-up bonus (PLN ${a})`],
  [/^Zwrot – domena (.+) nie została podłączona$/, (h) => `Refund – domain ${h} was not connected`],
  [/^Bonus powitalny z polecenia$/, () => "Referral welcome bonus"],
  [/^Bonus za polecenie \((.+)\)$/, (e) => `Referral bonus (${e})`],
  [/^Własna domena (.+) – 12 mies\.$/, (h) => `Custom domain ${h} – 12 months`],
  [/^Przedłużenie domeny (.+) – 12 mies\.$/, (h) => `Domain renewal ${h} – 12 months`],
  [/^publikacja galerii, pakiet (\S+), (\d+) mies\. – (.+)$/, (p, n, g) => `Gallery publication, ${PLAN_EN[p] ?? p} plan, ${n} mo. – ${g}`],
  [/^zmiana pakietu na (\S+) – (.+)$/, (p, g) => `Plan change to ${PLAN_EN[p] ?? p} – ${g}`],
  [/^przedłużenie dostępu o (\d+) mies\. – (.+)$/, (n, g) => `Access extended by ${n} mo. – ${g}`],
];
function descEn(s: string) {
  for (const [re, fn] of RULES) {
    const m = s.match(re);
    if (m) return fn(...m.slice(1));
  }
  return s;
}

// Saldo konta: doładowanie przez Przelewy24 i historia operacji
export default function WalletCard({
  balance,
  history,
  billing,
  topups,
}: {
  balance: number;
  history: WalletEntry[];
  billing: Billing;
  topups: { amount: number; bonus: number }[];
}) {
  const lang = useLang();
  const t = (pl: string, en: string) => tr(lang, pl, en);
  const z = (n: number) => money(n, lang);
  const fmt = (gr: number) => money(gr / 100, lang, true);
  const dateFmt = new Intl.DateTimeFormat(locale(lang), { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Warsaw" });
  const [amount, setAmount] = useState(100);
  const [invoice, setInvoice] = useState<Billing>(billing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);
  const pack = topups.find((x) => x.amount === amount);

  async function topup() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/wallet/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, invoice }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("Nie udało się rozpocząć płatności.", "Could not start the payment."));
      window.location.href = data.redirect;
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Nie udało się rozpocząć płatności.", "Could not start the payment."));
      setBusy(false);
    }
  }

  const list = showAll ? history : history.slice(0, 8);

  return (
    <div className="settings-card" id="saldo">
      <h2>{t("Saldo konta", "Account balance")}</h2>
      <p className="wallet-balance">{fmt(balance)}</p>
      <p>{t("Doładuj konto raz, a galerie publikujesz jednym kliknięciem, bez płacenia za każdą osobno.", "Top up once and publish galleries with one click, without paying for each one separately.")}</p>

      <div className="topups">
        {topups.map((x) => (
          <button
            key={x.amount}
            type="button"
            className={amount === x.amount ? "topup active" : "topup"}
            onClick={() => setAmount(x.amount)}
          >
            <b>{z(x.amount)}</b>
            {x.bonus > 0 && <span>+{z(x.bonus)} {t("gratis", "free")}</span>}
          </button>
        ))}
      </div>

      <InvoiceFields value={invoice} onChange={setInvoice} />

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button type="button" className="btn btn-dark" onClick={topup} disabled={busy}>
        {busy
          ? t("Przechodzę do płatności…", "Going to payment…")
          : `${t("Doładuj", "Top up")} ${z(amount)}${pack?.bonus ? ` (${t("na konto", "credited")} ${z(amount + pack.bonus)})` : ""}`}
      </button>
      <p className="test-note left">{t("BLIK, przelew lub karta przez Przelewy24. Niewykorzystane saldo zwracamy na życzenie.", "BLIK, bank transfer or card via Przelewy24. Unused balance is refunded on request.")}</p>

      <h3 className="wallet-h3">{t("Historia", "History")}</h3>
      {history.length === 0 ? (
        <p className="hint-inline">{t("Brak operacji.", "No transactions.")}</p>
      ) : (
        <>
          <ul className="wallet-history">
            {list.map((h) => (
              <li key={h.id}>
                <div>
                  <span>{lang === "en" ? descEn(h.description) : h.description}</span>
                  <small>{dateFmt.format(new Date(h.at))}</small>
                </div>
                <strong className={h.amount >= 0 ? "plus" : "minus"}>
                  {h.amount >= 0 ? "+" : "−"}
                  {fmt(Math.abs(h.amount))}
                </strong>
              </li>
            ))}
          </ul>
          {history.length > 8 && (
            <button type="button" className="as-link" onClick={() => setShowAll((v) => !v)}>
              {showAll ? t("Pokaż mniej", "Show less") : `${t("Pokaż wszystkie", "Show all")} (${history.length})`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
