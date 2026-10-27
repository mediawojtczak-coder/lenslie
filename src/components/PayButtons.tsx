"use client";

const fmt = (gr: number) => `${(gr / 100).toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł`;

// Wybór płatności: z salda konta albo od razu przez Przelewy24
export default function PayButtons({
  price,
  balance,
  busy,
  disabled,
  label,
  onPay,
}: {
  price: number; // zł
  balance: number; // grosze
  busy: boolean;
  disabled?: boolean;
  label: string; // np. „i opublikuj”
  onPay: (pay: "wallet" | "p24") => void;
}) {
  const priceGr = Math.round(price * 100);
  const enough = balance >= priceGr;
  return (
    <div className="pay-box">
      {enough ? (
        <>
          <p className="pay-balance">
            Stan konta: <strong>{fmt(balance)}</strong> · po zakupie {fmt(balance - priceGr)}
          </p>
          <button type="button" className="btn btn-wide btn-dark" disabled={busy || disabled} onClick={() => onPay("wallet")}>
            {busy ? "Chwileczkę…" : `Zapłać z salda ${fmt(priceGr)} ${label}`}
          </button>
          <button type="button" className="as-link pay-alt" disabled={busy || disabled} onClick={() => onPay("p24")}>
            albo zapłać teraz BLIK-iem, przelewem lub kartą
          </button>
        </>
      ) : (
        <>
          <p className="pay-short">
            Stan konta: <strong>{fmt(balance)}</strong>
            {balance > 0 && <> · do dopłaty {fmt(priceGr - balance)}</>} ·{" "}
            <a href="/panel/konto#saldo">Doładuj konto ›</a>
          </p>
          <button type="button" className="btn btn-wide btn-dark" disabled={busy || disabled} onClick={() => onPay("p24")}>
            {busy ? "Przechodzę do płatności…" : `Zapłać ${fmt(priceGr)} ${label}`}
          </button>
          <p className="test-note">BLIK, przelew lub karta przez Przelewy24.</p>
        </>
      )}
    </div>
  );
}
