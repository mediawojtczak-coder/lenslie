"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import InvoiceFields from "@/components/InvoiceFields";
import { useLang } from "@/components/LangProvider";
import { tr, money, locale } from "@/lib/lang";
import { planName, planPhotos, periodText, periodShort, perMonthL } from "@/lib/plans";
import PayButtons from "@/components/PayButtons";
import type { Billing } from "@/lib/billing";
import {
  PLANS,
  PERIODS,
  DEFAULT_PERIOD,
  periodLabel,
  upgradeCost,
  formatBytes,
  planBytes,
  getPlan,
  perMonth,
  type Period,
  type PlanId,
} from "@/lib/plans";

type Mode = "upgrade" | "extend" | "choose";


// Pakiet galerii: zajęte miejsce, data wygaśnięcia, zmiana pakietu i przedłużenie
export default function PlanBar({
  id,
  planId,
  period,
  expiresAt,
  usedBytes,
  billing,
  balance,
}: {
  id: string;
  planId: PlanId | null;
  period: Period | null;
  expiresAt: string | null;
  usedBytes: number;
  billing: Billing;
  balance: number;
}) {
  const [invoice, setInvoice] = useState<Billing>(billing);
  const lang = useLang();
  const t = (pl: string, en: string) => tr(lang, pl, en);
  const zl = (n: number) => money(n, lang);
  const dateFmt = new Intl.DateTimeFormat(locale(lang), { day: "numeric", month: "long", year: "numeric" });
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<Mode>("upgrade");
  const [target, setTarget] = useState<PlanId | null>(null);
  const [newPeriod, setNewPeriod] = useState<Period>(period ?? DEFAULT_PERIOD);
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
    setNewPeriod(period ?? DEFAULT_PERIOD);
    dialogRef.current?.showModal();
  }

  // PhotoManager prosi o otwarcie okna, gdy zdjęcia nie mieszczą się w pakiecie
  useEffect(() => {
    const handler = () => open(plan ? (expired ? "extend" : "upgrade") : "choose");
    window.addEventListener("lenslie:plan", handler);
    return () => window.removeEventListener("lenslie:plan", handler);
  });

  async function confirm(pay: "wallet" | "p24") {
    setBusy(true);
    setError("");
    try {
      const body =
        mode === "upgrade"
          ? { action: "upgrade", plan: target, invoice, pay }
          : mode === "extend"
            ? { action: "extend", period: newPeriod, invoice, pay }
            : { action: "choose", plan: target, period: newPeriod, invoice, pay };
      const res = await fetch(`/api/galleries/${id}/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("Nie udało się zapisać zmiany.", "Could not save the change."));
      if (data.redirect) {
        window.location.href = data.redirect;
        return;
      }
      dialogRef.current?.close();
      setDone(data.wallet ? `${t("Zapłacono z salda", "Paid from balance")}: ${zl(data.charged)}.` : data.test ? t("Zapisano (tryb testowy, bez płatności).", "Saved (test mode, no payment).") : t("Zapisano.", "Saved."));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Nie udało się zapisać zmiany.", "Could not save the change."));
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
              {t("Pakiet", "Plan")} <strong>{planName(plan, lang)}</strong>
              {period && <span> · {periodText(period, lang)}</span>}
            </p>
            <div className={share >= 1 ? "usage full" : share > 0.85 ? "usage warn" : "usage"}>
              <div className="usage-bar">
                <span style={{ width: `${Math.max(2, share * 100)}%` }} />
              </div>
              <p>
                {formatBytes(usedBytes)} {t("z", "of")} {plan.limitGb.toLocaleString(locale(lang))} GB
              </p>
            </div>
            {expiresAt && (
              <p className={expired ? "plan-exp expired" : "plan-exp"}>
                {expired ? t("Dostęp wygasł ", "Access expired on ") : t("Dostęp dla klienta do ", "Client access until ")}
                {dateFmt.format(new Date(expiresAt))}
                {expired && (
                  <>
                    . {t("Zdjęcia zostaną usunięte", "Photos will be deleted on")} {dateFmt.format(new Date(new Date(expiresAt).getTime() + 30 * 24 * 3600 * 1000))}
                  </>
                )}
              </p>
            )}
          </div>
          <div className="plan-actions">
            {bigger.length > 0 && (
              <button type="button" className="btn btn-ghost btn-small" onClick={() => open("upgrade")}>
                {t("Zmień pakiet", "Change plan")}
              </button>
            )}
            <button type="button" className="btn btn-ghost btn-small" onClick={() => open("extend")}>
              {t("Przedłuż dostęp", "Extend access")}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="plan-info">
            <p className="plan-name">{t("Ta galeria nie ma jeszcze pakietu", "This gallery has no plan yet")}</p>
            <p className="plan-exp">{t("Wybierz pakiet, aby przesyłać zdjęcia i udostępnić galerię klientowi.", "Choose a plan to upload photos and share the gallery.")}</p>
          </div>
          <div className="plan-actions">
            <button type="button" className="btn btn-small" onClick={() => open("choose")}>
              {t("Wybierz pakiet", "Choose plan")}
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
            {mode === "upgrade" ? t("Zmień pakiet", "Change plan") : mode === "extend" ? t("Przedłuż dostęp", "Extend access") : t("Wybierz pakiet", "Choose plan")}
          </h2>

          {(mode === "upgrade" || mode === "choose") && (
            <div className="plan-pick">
              {(mode === "upgrade" ? bigger : PLANS).map((p) => (
                <label key={p.id} className={target === p.id ? "pick active" : "pick"}>
                  <input type="radio" name="plan" checked={target === p.id} onChange={() => setTarget(p.id)} />
                  <span className="pick-title">{planName(p, lang)}</span>
                  <span className="pick-desc">
                    {t("do", "up to")} {p.limitGb.toLocaleString(locale(lang))} GB · {planPhotos(p, lang)}
                  </span>
                  <span className="pick-price">
                    {mode === "upgrade" && plan && period
                      ? `${t("dopłata", "extra")} ${zl(upgradeCost(plan, p, period))}`
                      : zl(p.prices[newPeriod])}
                  </span>
                </label>
              ))}
            </div>
          )}

          {(mode === "extend" || mode === "choose") && (
            <>
              <p className="share-sub">{mode === "extend" ? t("Przedłuż o", "Extend by") : t("Dostęp dla klienta", "Client access")}</p>
              <div className="period-switch">
                {PERIODS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={newPeriod === p ? "period active" : "period"}
                    onClick={() => setNewPeriod(p)}
                  >
                    {periodShort(p, lang)}
                    {plan && mode === "extend" && (
                      <small className="period-sub">
                        {zl(plan.prices[p])} · {perMonthL(plan.prices[p], p, lang)}
                      </small>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}

          {mode === "upgrade" && (
            <p className="hint-inline">
              {t("Płacisz tylko różnicę w cenie. Data wygaśnięcia galerii się nie zmienia.", "You only pay the price difference. The expiry date stays the same.")}
            </p>
          )}
          {mode === "extend" && expiresAt && plan && (
            <p className="hint-inline">
              {t("Nowa data wygaśnięcia liczona od", "The new expiry date is counted from")}{" "}
              {expired ? t("dzisiaj", "today") : dateFmt.format(new Date(expiresAt))}.
            </p>
          )}

          <InvoiceFields value={invoice} onChange={setInvoice} />

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          <PayButtons
            price={price}
            balance={balance}
            busy={busy}
            disabled={mode !== "extend" && !target}
            label=""
            onPay={confirm}
          />
          <button type="button" className="as-link pay-cancel" onClick={() => dialogRef.current?.close()}>
            {t("Anuluj", "Cancel")}
          </button>
        </div>
      </dialog>
    </section>
  );
}
