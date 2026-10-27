"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTr } from "@/components/LangProvider";

// Limit ulubionych: klient może wybrać najwyżej N zdjęć (np. do albumu), z licznikiem w galerii
export default function PickLimitCard({
  id,
  limit,
  selling,
}: {
  id: string;
  limit: { max: number; label: string } | null;
  selling: boolean;
}) {
  const t = useTr();
  const router = useRouter();
  const [on, setOn] = useState(Boolean(limit));
  const [max, setMax] = useState(String(limit?.max ?? 60));
  const [label, setLabel] = useState(limit?.label ?? t("do albumu", "for the album"));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/galleries/${id}/sale`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "limit", max: on ? max : 0, label }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? t("Nie udało się zapisać.", "Could not save."));
      setMsg({ ok: true, text: t("Zapisano.", "Saved.") });
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : t("Nie udało się zapisać.", "Could not save.") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="settings-card">
      <h2>{t("Limit wyboru zdjęć", "Selection limit")}</h2>
      <p>
        {t(
          "Np. „wybierz 60 zdjęć do albumu”. Klient widzi licznik, a po osiągnięciu limitu nie zaznaczy kolejnego zdjęcia, dopóki nie odznaczy innego.",
          "E.g. “choose 60 photos for the album”. Your client sees a counter and cannot select more photos once the limit is reached.",
        )}
      </p>
      {selling ? (
        <p className="hint-inline">{t("Przy włączonej sprzedaży zdjęć limit nie obowiązuje – liczy się pakiet.", "With photo sales on, the limit does not apply – the package does.")}</p>
      ) : (
        <>
          <label className="check">
            <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} />
            {t("Ogranicz liczbę ulubionych zdjęć", "Limit the number of favourite photos")}
          </label>
          {on && (
            <div className="sale-fields">
              <div>
                <label htmlFor="pl-max">{t("Najwyżej zdjęć", "Maximum photos")}</label>
                <input id="pl-max" type="number" min={1} max={5000} inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value)} />
              </div>
              <div>
                <label htmlFor="pl-label">{t("Cel wyboru (opcjonalnie)", "Purpose (optional)")}</label>
                <input id="pl-label" value={label} maxLength={60} onChange={(e) => setLabel(e.target.value)} placeholder={t("do albumu", "for the album")} />
              </div>
            </div>
          )}
          {msg && (
            <p className={msg.ok ? "success" : "error"} role={msg.ok ? undefined : "alert"}>
              {msg.text}
            </p>
          )}
          <button type="button" className="btn" onClick={save} disabled={busy}>
            {busy ? t("Zapisuję…", "Saving…") : t("Zapisz limit", "Save limit")}
          </button>
        </>
      )}
    </div>
  );
}
