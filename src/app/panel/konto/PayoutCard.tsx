"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTr } from "@/components/LangProvider";
import type { Payout } from "@/lib/sales";

// Dane, na które klienci wpłacają pieniądze za dodatkowe zdjęcia
export default function PayoutCard({ payout }: { payout: Payout | null }) {
  const t = useTr();
  const router = useRouter();
  const [holder, setHolder] = useState(payout?.holder ?? "");
  const [account, setAccount] = useState(payout?.account ?? "");
  const [blik, setBlik] = useState(payout?.blik ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "payout", payout: { holder, account, blik } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("Nie udało się zapisać.", "Could not save."));
      setAccount(data.payout.account);
      setBlik(data.payout.blik);
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
      <h2>{t("Wpłaty od klientów", "Client payments")}</h2>
      <p>
        {t(
          "Gdy klient zamówi dodatkowe zdjęcia, zobaczy te dane i wpłaci pieniądze bezpośrednio Tobie. Lenslie nie pobiera od tego prowizji.",
          "When a client orders extra photos, they see these details and pay you directly. Lenslie takes no commission.",
        )}
      </p>
      <label htmlFor="po-holder">{t("Odbiorca przelewu", "Transfer recipient")}</label>
      <input id="po-holder" value={holder} maxLength={100} onChange={(e) => setHolder(e.target.value)} placeholder={t("np. Anna Nowak Fotografia", "e.g. Anna Smith Photography")} />
      <label htmlFor="po-account">{t("Numer konta", "Bank account number")}</label>
      <input id="po-account" value={account} inputMode="numeric" onChange={(e) => setAccount(e.target.value)} placeholder="00 0000 0000 0000 0000 0000 0000" />
      <label htmlFor="po-blik">{t("Telefon do BLIK (opcjonalnie)", "BLIK phone number (optional)")}</label>
      <input id="po-blik" value={blik} inputMode="tel" onChange={(e) => setBlik(e.target.value)} placeholder="600 000 000" />
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
