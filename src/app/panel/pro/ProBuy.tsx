"use client";

import { useState } from "react";
import { useLang } from "@/components/LangProvider";
import { tr, money } from "@/lib/lang";
import PayButtons from "@/components/PayButtons";
import InvoiceFields from "@/components/InvoiceFields";
import type { Billing } from "@/lib/billing";
import { PRO_TIERS, proName, proPrice, proHardLimit, proVideoSeconds, type ProTierId, type ProMonths } from "@/lib/pro-plans";

// Zakup / przedłużenie abonamentu Pro albo zmiana na większy pakiet
export default function ProBuy({
  current,
  active,
  usedBytes,
  videoSeconds = 0,
  upgrade,
  balance,
  billing,
}: {
  current: ProTierId | null; // aktualny (lub ostatni) pakiet
  active: boolean;
  usedBytes: number;
  videoSeconds?: number; // łączna długość filmów w galeriach
  upgrade: Partial<Record<ProTierId, number>>; // dopłaty za zmianę na większy (zł)
  balance: number;
  billing: Billing;
}) {
  const lang = useLang();
  const t = (pl: string, en: string) => tr(lang, pl, en);
  const order = PRO_TIERS.map((x) => x.id);
  const [mode, setMode] = useState<"buy" | "upgrade">("buy");
  const [tier, setTier] = useState<ProTierId>(current ?? "pro700");
  const [months, setMonths] = useState<ProMonths>(12);
  const [invoice, setInvoice] = useState<Billing>(billing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const bigger = current ? PRO_TIERS.filter((x) => order.indexOf(x.id) > order.indexOf(current)) : [];
  const sel = PRO_TIERS.find((x) => x.id === tier)!;
  const price = mode === "upgrade" ? (upgrade[tier] ?? 0) : proPrice(sel, months);
  // przy aktywnym abonamencie przedłużamy ten sam pakiet; większy – przez „Zmień na większy”
  const lockedTier = active && mode === "buy";

  async function buy(pay: "wallet" | "p24") {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/pro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: mode, tier, months, pay, invoice }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      if (data.redirect) {
        window.location.href = data.redirect;
        return;
      }
      setDone(true);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setBusy(false);
    }
  }

  return (
    <div className="pro-buy">
      {active && bigger.length > 0 && (
        <div className="period-switch pro-mode">
          <button type="button" className={mode === "buy" ? "period active" : "period"} onClick={() => { setMode("buy"); setTier(current!); }}>
            {t("Przedłuż", "Extend")}
          </button>
          <button type="button" className={mode === "upgrade" ? "period active" : "period"} onClick={() => { setMode("upgrade"); setTier(bigger[0].id); }}>
            {t("Zmień na większy", "Upgrade")}
          </button>
        </div>
      )}

      <div className="pro-tiers">
        {PRO_TIERS.map((x) => {
          const tooSmall = usedBytes > proHardLimit(x) || videoSeconds > proVideoSeconds(x);
          const hidden = (lockedTier && x.id !== current) || (mode === "upgrade" && !bigger.some((b) => b.id === x.id));
          if (hidden) return null;
          return (
            <button
              key={x.id}
              type="button"
              className={tier === x.id ? "pro-tier on" : "pro-tier"}
              disabled={tooSmall}
              onClick={() => setTier(x.id)}
              title={tooSmall ? t("Twoje galerie zajmują więcej miejsca albo mają dłuższe filmy", "Your galleries use more space or longer videos") : undefined}
            >
              {x.featured && !active && <span className="pub-badge">{t("Najczęściej wybierany", "Most popular")}</span>}
              <strong>{proName(x)}</strong>
              <small>{t(`filmy do ${x.videoHours} h`, `videos up to ${x.videoHours} h`)}</small>
              {mode === "upgrade" ? (
                <em>
                  +{money(upgrade[x.id] ?? 0, lang)} <small>{t("do końca okresu", "until period end")}</small>
                </em>
              ) : (
                <em>
                  {money(months === 12 ? x.yearly : x.monthly, lang)} <small>{months === 12 ? t("/ rok", "/ year") : t("/ mies.", "/ mo.")}</small>
                </em>
              )}
            </button>
          );
        })}
      </div>

      {mode === "buy" && (
        <div className="period-switch">
          {([12, 1] as const).map((m) => (
            <button key={m} type="button" className={months === m ? "period active" : "period"} onClick={() => setMonths(m)}>
              {m === 12 ? t("Rok", "Year") : t("Miesiąc", "Month")}
              <small className="period-sub">{m === 12 ? t("12 miesięcy z góry", "12 months in advance") : t("bez zobowiązań", "no commitment")}</small>
            </button>
          ))}
        </div>
      )}
      {mode === "upgrade" && (
        <p className="hint-inline">
          {t(
            "Płacisz tylko różnicę za dni, które zostały do końca obecnego okresu. Data końca abonamentu się nie zmienia.",
            "You only pay the difference for the days left in the current period. The end date stays the same.",
          )}
        </p>
      )}

      <InvoiceFields value={invoice} onChange={setInvoice} />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!done && (
        <PayButtons
          price={price}
          balance={balance}
          busy={busy}
          label={mode === "upgrade" ? t("i zmień pakiet", "and upgrade") : active ? t("i przedłuż", "and extend") : t("i włącz Pro", "and start Pro")}
          onPay={buy}
        />
      )}
    </div>
  );
}
