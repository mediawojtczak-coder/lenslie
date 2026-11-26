"use client";

import { useLang } from "./LangProvider";
import { money, tr } from "@/lib/lang";
import { useCur, useCurBalance } from "./CurrencyProvider";
import { fmtCur, fromPln } from "@/lib/foreign-prices";

// Wybór płatności: z salda konta albo od razu przez Przelewy24
// (w angielskiej wersji z płatnościami Stripe – kartą, Apple Pay, Google Pay w walucie kraju)
export default function PayButtons({
  price,
  foreign,
  freeLabel,
  balance,
  busy,
  disabled,
  label,
  onPay,
}: {
  price: number; // zł
  foreign?: number; // cena w walucie klienta (Stripe); bez niej – przeliczenie z zł
  freeLabel?: string; // napis przycisku, gdy nic nie trzeba płacić (np. pierwsza galeria gratis)
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
          {busy ? t("Chwileczkę…", "One moment…") : freeLabel ?? t("Włącz – w cenie abonamentu Pro", "Turn on – included in Pro")}
        </button>
      </div>
    );
  }
  const cur = useCur();
  const curBalance = useCurBalance();
  if (cur) {
    const f = foreign ?? fromPln(price, cur);
    const fEnough = curBalance >= Math.round(f * 100);
    const card = (
      <button type="button" className={fEnough ? "as-link pay-alt" : "btn btn-wide btn-dark"} disabled={busy || disabled} onClick={() => onPay("p24")}>
        {busy && !fEnough ? "Redirecting to payment…" : fEnough ? `or pay ${fmtCur(f, cur)} by card` : `Pay ${fmtCur(f, cur)} ${label}`}
      </button>
    );
    return (
      <div className="pay-box">
        {fEnough && (
          <button type="button" className="btn btn-wide btn-dark" disabled={busy || disabled} onClick={() => onPay("wallet")}>
            {busy ? "One moment…" : `Pay ${fmtCur(f, cur)} from balance ${label}`}
          </button>
        )}
        {card}
        <p className="test-note">
          {fEnough
            ? `Balance: ${fmtCur(curBalance / 100, cur)}.`
            : curBalance > 0
              ? `Balance: ${fmtCur(curBalance / 100, cur)} – not enough. Card, Apple Pay or Google Pay – secure checkout by Stripe.`
              : "Card, Apple Pay or Google Pay – secure checkout by Stripe."}
        </p>
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
