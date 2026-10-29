"use client";

import { useLang } from "./LangProvider";
import { money, tr } from "@/lib/lang";

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
  const lang = useLang();
  const t = (pl: string, en: string) => tr(lang, pl, en);
  const fmt = (gr: number) => money(gr / 100, lang, true);
  const priceGr = Math.round(price * 100);
  const enough = balance >= priceGr;
  if (priceGr <= 0) {
    return (
      <div className="pay-box">
        <button type="button" className="btn btn-wide btn-dark" disabled={busy || disabled} onClick={() => onPay("wallet")}>
          {busy ? t("Chwileczkę…", "One moment…") : t("Włącz – w cenie abonamentu Pro", "Turn on – included in Pro")}
        </button>
      </div>
    );
  }
  return (
    <div className="pay-box">
      {enough ? (
        <>
          <p className="pay-balance">
            {t("Stan konta", "Balance")}: <strong>{fmt(balance)}</strong> · {t("po zakupie", "after purchase")} {fmt(balance - priceGr)}
          </p>
          <button type="button" className="btn btn-wide btn-dark" disabled={busy || disabled} onClick={() => onPay("wallet")}>
            {busy ? t("Chwileczkę…", "One moment…") : `${t("Zapłać z salda", "Pay from balance")} ${fmt(priceGr)} ${label}`}
          </button>
          <button type="button" className="as-link pay-alt" disabled={busy || disabled} onClick={() => onPay("p24")}>
            {t("albo zapłać teraz BLIK-iem, przelewem lub kartą", "or pay now by BLIK, bank transfer or card")}
          </button>
        </>
      ) : (
        <>
          <p className="pay-short">
            {t("Stan konta", "Balance")}: <strong>{fmt(balance)}</strong>
            {balance > 0 && <> · {t("do dopłaty", "missing")} {fmt(priceGr - balance)}</>} ·{" "}
            <a href="/panel/konto?tab=saldo">{t("Doładuj konto ›", "Top up ›")}</a>
          </p>
          <button type="button" className="btn btn-wide btn-dark" disabled={busy || disabled} onClick={() => onPay("p24")}>
            {busy ? t("Przechodzę do płatności…", "Redirecting to payment…") : `${t("Zapłać", "Pay")} ${fmt(priceGr)} ${label}`}
          </button>
          <p className="test-note">{t("BLIK, przelew lub karta przez Przelewy24.", "BLIK, bank transfer or card via Przelewy24 (PLN).")}</p>
        </>
      )}
    </div>
  );
}
