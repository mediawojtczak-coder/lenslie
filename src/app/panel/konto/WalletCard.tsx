"use client";

import { useState } from "react";
import InvoiceFields from "@/components/InvoiceFields";
import type { Billing } from "@/lib/billing";
import type { WalletEntry } from "@/lib/wallet";

const fmt = (gr: number) => `${(gr / 100).toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł`;
const dateFmt = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Warsaw" });

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
  const [amount, setAmount] = useState(100);
  const [invoice, setInvoice] = useState<Billing>(billing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);
  const pack = topups.find((t) => t.amount === amount);

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
      if (!res.ok) throw new Error(data.error ?? "Nie udało się rozpocząć płatności.");
      window.location.href = data.redirect;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się rozpocząć płatności.");
      setBusy(false);
    }
  }

  const list = showAll ? history : history.slice(0, 8);

  return (
    <div className="settings-card" id="saldo">
      <h2>Saldo konta</h2>
      <p className="wallet-balance">{fmt(balance)}</p>
      <p>Doładuj konto raz, a galerie publikujesz jednym kliknięciem, bez płacenia za każdą osobno.</p>

      <div className="topups">
        {topups.map((t) => (
          <button
            key={t.amount}
            type="button"
            className={amount === t.amount ? "topup active" : "topup"}
            onClick={() => setAmount(t.amount)}
          >
            <b>{t.amount} zł</b>
            {t.bonus > 0 && <span>+{t.bonus} zł gratis</span>}
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
          ? "Przechodzę do płatności…"
          : `Doładuj ${amount} zł${pack?.bonus ? ` (na konto ${amount + pack.bonus} zł)` : ""}`}
      </button>
      <p className="test-note left">BLIK, przelew lub karta przez Przelewy24. Niewykorzystane saldo zwracamy na życzenie.</p>

      <h3 className="wallet-h3">Historia</h3>
      {history.length === 0 ? (
        <p className="hint-inline">Brak operacji.</p>
      ) : (
        <>
          <ul className="wallet-history">
            {list.map((h) => (
              <li key={h.id}>
                <div>
                  <span>{h.description}</span>
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
              {showAll ? "Pokaż mniej" : `Pokaż wszystkie (${history.length})`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
