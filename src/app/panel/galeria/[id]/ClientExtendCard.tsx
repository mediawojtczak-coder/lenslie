"use client";

import { useState } from "react";
import { useTr } from "@/components/LangProvider";

// Czy klient widzi licznik dni i może sam przedłużyć galerię
export default function ClientExtendCard({ id, on: initial }: { id: string; on: boolean }) {
  const t = useTr();
  const [on, setOn] = useState(initial);
  const [msg, setMsg] = useState("");

  async function toggle(next: boolean) {
    setOn(next);
    setMsg("");
    const res = await fetch(`/api/galleries/${id}/client-extend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ on: next }),
    }).catch(() => null);
    if (!res?.ok) {
      setOn(!next);
      setMsg(t("Nie udało się zapisać.", "Could not save."));
    } else setMsg(t("Zapisano.", "Saved."));
  }

  return (
    <div className="settings-card">
      <h2>{t("Przedłużanie przez klienta", "Extension by your client")}</h2>
      <p>
        {t(
          "Klient widzi w galerii, ile dni dostępu zostało, może ustawić sobie przypomnienie mailem i sam opłacić przedłużenie (BLIK, karta, przelew): 1 mies. – 20 zł, 3 mies. – 30 zł, 6 mies. – 40 zł, 12 mies. – 50 zł. Dostaniesz maila, gdy to zrobi. Po wygaśnięciu może jeszcze przez 30 dni przywrócić galerię.",
          "Your client sees how many days of access are left, can set an e-mail reminder and pay for an extension themselves (card, BLIK, transfer): 1 mo. – PLN 20, 3 mo. – PLN 30, 6 mo. – PLN 40, 12 mo. – PLN 50. You'll get an e-mail when they do. After expiry they can still restore the gallery for 30 days.",
        )}
      </p>
      <label className="check">
        <input type="checkbox" checked={on} onChange={(e) => toggle(e.target.checked)} />
        {t("Klient może sam przedłużyć galerię", "Let your client extend the gallery")}
      </label>
      {msg && <p className="hint-inline">{msg}</p>}
    </div>
  );
}
