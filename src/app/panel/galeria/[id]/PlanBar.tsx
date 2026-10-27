"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PLANS,
  PERIODS,
  periodLabel,
  upgradeCost,
  formatBytes,
  planBytes,
  getPlan,
  type Period,
  type PlanId,
} from "@/lib/plans";

type Mode = "upgrade" | "extend" | "choose";

const dateFmt = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric" });
const zl = (n: number) => `${n.toLocaleString("pl-PL", { maximumFractionDigits: 2 })} zł`;

// Pakiet galerii: zajęte miejsce, data wygaśnięcia, zmiana pakietu i przedłużenie
export default function PlanBar({
  id,
  planId,
  period,
  expiresAt,
  usedBytes,
}: {
  id: string;
  planId: PlanId | null;
  period: Period | null;
  expiresAt: string | null;
  usedBytes: number;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<Mode>("upgrade");
  const [target, setTarget] = useState<PlanId | null>(null);
  const [newPeriod, setNewPeriod] = useState<Period>(period ?? 12);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const plan = getPlan(planId);
  const expired = Boolean(expiresAt && new Date(expiresAt).getTime() < Date.now());
  const share = plan ? Math.min(1, usedBytes / planBytes(plan)) : 0;
  const order = PLANS.map((p) => p.id);
  const bigger = plan ? PLANS.filter((p) => order.indexOf(p.id) > order.indexOf(plan.id)) : [];

  function open(m: Mode) {
    setMode(m);
    setError("");
    setTarget(m === "upgrade" ? (bigger[0]?.id ?? null) : m === "choose" ? "srednia" : null);
    setNewPeriod(period ?? 12);
    dialogRef.current?.showModal();
  }

  // PhotoManager prosi o otwarcie okna, gdy zdjęcia nie mieszczą się w pakiecie
  useEffect(() => {
    const handler = () => open(plan ? (expired ? "extend" : "upgrade") : "choose");
    window.addEventListener("lenslie:plan", handler);
    return () => window.removeEventListener("lenslie:plan", handler);
  });

  async function confirm() {
    setBusy(true);
    setError("");
    try {
      const body =
        mode === "upgrade"
          ? { action: "upgrade", plan: target }
          : mode === "extend"
            ? { action: "extend", period: newPeriod }
            : { action: "choose", plan: target, period: newPeriod };
      const res = await fetch(`/api/galleries/${id}/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Nie udało się zapisać zmiany.");
      dialogRef.current?.close();
      setDone(`Zapisano. Kwota do zapłaty: ${zl(data.charged)} (tryb testowy, bez płatności).`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zapisać zmiany.");
    } finally {
      setBusy(false);
    }
  }

  const targetPlan = getPlan(target);
  const price =
    mode === "upgrade" && plan && targetPlan && period
      ? upgradeCost(plan, targetPlan, period)
      : mode === "extend" && plan
        ? plan.prices[newPeriod]
        : mode === "choose" && targetPlan
          ? targetPlan.prices[newPeriod]
          : 0;

  return (
    <section className="plan-bar">
      {plan ? (
        <>
          <div className="plan-info">
            <p className="plan-name">
              Pakiet <strong>{plan.name}</strong>
              {period && <span> · {periodLabel(period)}</span>}
            </p>
            <div className={share >= 1 ? "usage full" : share > 0.85 ? "usage warn" : "usage"}>
              <div className="usage-bar">
                <span style={{ width: `${Math.max(2, share * 100)}%` }} />
              </div>
              <p>
                {formatBytes(usedBytes)} z {plan.limitGb.toLocaleString("pl-PL")} GB
              </p>
            </div>
            {expiresAt && (
              <p className={expired ? "plan-exp expired" : "plan-exp"}>
                {expired ? "Dostęp wygasł " : "Dostęp dla klienta do "}
                {dateFmt.format(new Date(expiresAt))}
              </p>
            )}
          </div>
          <div className="plan-actions">
            {bigger.length > 0 && (
              <button type="button" className="btn btn-ghost btn-small" onClick={() => open("upgrade")}>
                Zmień pakiet
              </button>
            )}
            <button type="button" className="btn btn-ghost btn-small" onClick={() => open("extend")}>
              Przedłuż dostęp
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="plan-info">
            <p className="plan-name">Ta galeria nie ma jeszcze pakietu</p>
            <p className="plan-exp">Wybierz pakiet, aby przesyłać zdjęcia i udostępnić galerię klientowi.</p>
          </div>
          <div className="plan-actions">
            <button type="button" className="btn btn-small" onClick={() => open("choose")}>
              Wybierz pakiet
            </button>
          </div>
        </>
      )}
      {done && <p className="plan-done">{done}</p>}

      <dialog
        ref={dialogRef}
        className="modal"
        aria-labelledby="plan-title"
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close();
        }}
      >
        <div className="modal-body">
          <h2 id="plan-title">
            {mode === "upgrade" ? "Zmień pakiet" : mode === "extend" ? "Przedłuż dostęp" : "Wybierz pakiet"}
          </h2>

          {(mode === "upgrade" || mode === "choose") && (
            <div className="plan-pick">
              {(mode === "upgrade" ? bigger : PLANS).map((p) => (
                <label key={p.id} className={target === p.id ? "pick active" : "pick"}>
                  <input type="radio" name="plan" checked={target === p.id} onChange={() => setTarget(p.id)} />
                  <span className="pick-title">{p.name}</span>
                  <span className="pick-desc">
                    do {p.limitGb.toLocaleString("pl-PL")} GB · {p.photos}
                  </span>
                  <span className="pick-price">
                    {mode === "upgrade" && plan && period
                      ? `dopłata ${zl(upgradeCost(plan, p, period))}`
                      : zl(p.prices[newPeriod])}
                  </span>
                </label>
              ))}
            </div>
          )}

          {(mode === "extend" || mode === "choose") && (
            <>
              <p className="share-sub">{mode === "extend" ? "Przedłuż o" : "Dostęp dla klienta"}</p>
              <div className="period-switch">
                {PERIODS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={newPeriod === p ? "period active" : "period"}
                    onClick={() => setNewPeriod(p)}
                  >
                    {p === 1 ? "1 mies." : `${p} mies.`}
                  </button>
                ))}
              </div>
            </>
          )}

          {mode === "upgrade" && (
            <p className="hint-inline">
              Płacisz tylko różnicę w cenie. Data wygaśnięcia galerii się nie zmienia.
            </p>
          )}
          {mode === "extend" && expiresAt && plan && (
            <p className="hint-inline">
              Nowa data wygaśnięcia liczona od{" "}
              {expired ? "dzisiaj" : dateFmt.format(new Date(expiresAt))}.
            </p>
          )}

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          <div className="modal-actions">
            <button type="button" className="as-link" onClick={() => dialogRef.current?.close()}>
              Anuluj
            </button>
            <button type="button" className="btn" onClick={confirm} disabled={busy || ((mode !== "extend") && !target)}>
              {busy ? "Zapisuję…" : `Zapłać ${zl(price)}`}
            </button>
          </div>
          <p className="test-note">Tryb testowy: płatności zostaną podłączone później, teraz zmiana zapisuje się bez opłaty.</p>
        </div>
      </dialog>
    </section>
  );
}
