"use client";

import { useState } from "react";
import { useLang } from "@/components/LangProvider";
import { tr, money } from "@/lib/lang";
import PayButtons from "@/components/PayButtons";
import InvoiceFields from "@/components/InvoiceFields";
import type { Billing } from "@/lib/billing";

const PRICES = { 1: 39, 12: 290 } as const;

// Zakup abonamentu Projektora albumów (miesiąc albo rok z góry)
export default function AlbumSubCard({ balance, billing, returnPath, compact = false }: { balance: number; billing: Billing; returnPath: string; compact?: boolean }) {
  const lang = useLang();
  const t = (pl: string, en: string) => tr(lang, pl, en);
  const [months, setMonths] = useState<1 | 12>(12);
  const [invoice, setInvoice] = useState<Billing>(billing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function buy(pay: "wallet" | "p24") {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/album", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ months, pay, invoice, returnPath }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      if (data.redirect) {
        window.location.href = data.redirect;
        return;
      }
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setBusy(false);
    }
  }

  return (
    <div className={compact ? "alb-sub compact" : "alb-sub"}>
      {!compact && <h2>{t("Abonament", "Subscription")}</h2>}
      <p className="hint-inline">
        {t(
          "Projektowanie i podgląd są za darmo, a pierwszy album możesz pobrać bez opłat na próbę. Abonament pozwala pobierać pliki do druku – bez limitu albumów, ze wszystkich galerii.",
          "Designing and previewing are free, and your first album download is a free trial. The subscription lets you download print files – unlimited albums from all your galleries.",
        )}
      </p>
      <div className="alb-plans">
        {([12, 1] as const).map((m) => (
          <button key={m} type="button" className={months === m ? "alb-plan on" : "alb-plan"} onClick={() => setMonths(m)}>
            <span>{m === 12 ? t("Rok", "Year") : t("Miesiąc", "Month")}</span>
            <strong>{money(PRICES[m], lang)}</strong>
            <small>{m === 12 ? t("oszczędzasz 178 zł", "save PLN 178") : t("bez zobowiązań", "no commitment")}</small>
          </button>
        ))}
      </div>
      <InvoiceFields value={invoice} onChange={setInvoice} />
      <PayButtons price={PRICES[months]} balance={balance} busy={busy} label={t("i pobieraj", "and download")} onPay={buy} />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
