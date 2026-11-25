"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLang, useTr } from "@/components/LangProvider";
import type { Payout } from "@/lib/sales";

// Dane, na które klienci wpłacają pieniądze za dodatkowe zdjęcia
export default function PayoutCard({ payout }: { payout: Payout | null }) {
  const t = useTr();
  const en = useLang() === "en";
  const router = useRouter();
  const [holder, setHolder] = useState(payout?.holder ?? "");
  const [account, setAccount] = useState(payout?.account ?? "");
  const [blik, setBlik] = useState(payout?.blik ?? "");
  const [swift, setSwift] = useState(payout?.swift ?? "");
  const [paypal, setPaypal] = useState(payout?.paypal ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "payout", payout: { holder, account, blik: en ? "" : blik, swift, paypal } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("Nie udało się zapisać.", "Could not save."));
      setAccount(data.payout.account);
      setBlik(data.payout.blik);
      setSwift(data.payout.swift ?? "");
      setPaypal(data.payout.paypal ?? "");
      setMsg({ ok: true, text: t("Zapisano.", "Saved.") });
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : t("Nie udało się zapisać.", "Could not save.") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="settings-card"
      id="wplaty"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <h2>{t("Wpłaty od klientów", en ? "Bank transfer and PayPal details" : "Client payments")}</h2>
      <p>
        {t(
          "Gdy klient zamówi dodatkowe zdjęcia, zobaczy te dane i wpłaci pieniądze bezpośrednio Tobie. Lenslie nie pobiera od tego prowizji.",
          "When a client orders extra photos by bank transfer or PayPal, they see these details and pay you directly. Lenslie takes no commission on these payments.",
        )}
      </p>
      <label htmlFor="po-holder">{t("Odbiorca przelewu", "Account holder")}</label>
      <input id="po-holder" value={holder} maxLength={100} onChange={(e) => setHolder(e.target.value)} placeholder={t("np. Anna Nowak Fotografia", "e.g. Anna Smith Photography")} />
      <label htmlFor="po-account">{t("Numer konta", "IBAN or bank account number")}</label>
      <input
        id="po-account"
        value={account}
        inputMode={en ? "text" : "numeric"}
        onChange={(e) => setAccount(e.target.value)}
        placeholder={en ? "e.g. GB29 NWBK 6016 1331 9268 19" : "00 0000 0000 0000 0000 0000 0000"}
      />
      {en ? (
        <>
          <label htmlFor="po-swift">SWIFT / BIC (optional)</label>
          <input id="po-swift" value={swift} onChange={(e) => setSwift(e.target.value)} placeholder="e.g. NWBKGB2L" />
          <label htmlFor="po-paypal">PayPal (optional)</label>
          <input id="po-paypal" value={paypal} onChange={(e) => setPaypal(e.target.value)} placeholder="your PayPal e-mail or paypal.me/yourname" />
        </>
      ) : (
        <>
          <label htmlFor="po-blik">{t("Telefon do BLIK (opcjonalnie)", "BLIK phone number (optional)")}</label>
          <input id="po-blik" value={blik} inputMode="tel" onChange={(e) => setBlik(e.target.value)} placeholder="600 000 000" />
        </>
      )}
      {msg && (
        <p className={msg.ok ? "success" : "error"} role={msg.ok ? undefined : "alert"}>
          {msg.text}
        </p>
      )}
      <button type="submit" className="btn" disabled={busy}>
        {busy ? t("Zapisuję…", "Saving…") : t("Zapisz dane", "Save details")}
      </button>
    </form>
  );
}
