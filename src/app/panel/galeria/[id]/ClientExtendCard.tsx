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
          "Klient widzi w galerii, ile dni dostępu zostało, i może sam opłacić przedłużenie (BLIK, karta, przelew) – w tych samych cenach co w panelu. Dostaniesz maila, gdy to zrobi. Po wygaśnięciu może jeszcze przez 30 dni przywrócić galerię.",
          "Your client sees how many days of access are left and can pay for an extension themselves (card, BLIK, transfer) at the same prices as in your dashboard. You'll get an e-mail when they do. After expiry they can still restore the gallery for 30 days.",
        )}
      </p>
      <label className="check">
        <input type="checkbox" checked={on} onChange={(e) => toggle(e.target.checked)} />
        {t("Pokazuj klientowi licznik dni i przycisk „Przedłuż dostęp”", "Show the days left and an “Extend access” button")}
      </label>
      {msg && <p className="hint-inline">{msg}</p>}
    </div>
  );
}
