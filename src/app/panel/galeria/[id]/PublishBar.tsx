"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import InvoiceFields from "@/components/InvoiceFields";
import type { Billing } from "@/lib/billing";
import { PLANS, PERIODS, DEFAULT_PERIOD, fitPlan, formatBytes, perMonth, zl, hardLimitBytes, type Period, type PlanId } from "@/lib/plans";

function photosLabel(n: number) {
  if (n === 1) return "1 zdjęcie";
  const lastTwo = n % 100;
  const last = n % 10;
  if (last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) return `${n} zdjęcia`;
  return `${n} zdjęć`;
}

// Galeria w wersji roboczej: różowy pasek u góry i okno publikacji z ceną dobraną do rozmiaru galerii
export default function PublishBar({
  id,
  title,
  photoCount,
  usedBytes,
  deleteOn,
  billing,
}: {
  id: string;
  title: string;
  photoCount: number;
  usedBytes: number;
  deleteOn?: string | null;
  billing: Billing;
}) {
  const [invoice, setInvoice] = useState<Billing>(billing);
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fit = fitPlan(usedBytes);
  const [planId, setPlanId] = useState<PlanId | null>(fit?.id ?? null);
  const [period, setPeriod] = useState<Period>(DEFAULT_PERIOD);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const plan = PLANS.find((p) => p.id === planId) ?? null;
  const price = plan ? plan.prices[period] : 0;

  function open() {
    setPlanId(fitPlan(usedBytes)?.id ?? null);
    setPeriod(DEFAULT_PERIOD);
    setError("");
    dialogRef.current?.showModal();
  }

  async function publish() {
    if (!plan) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/galleries/${id}/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "choose", plan: plan.id, period, invoice }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Nie udało się opublikować galerii.");
      if (data.redirect) {
        window.location.href = data.redirect;
        return;
      }
      dialogRef.current?.close();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się opublikować galerii.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="draft-bar">
      <div className="draft-text">
        <p className="draft-title">Wersja robocza</p>
        <p className="draft-note">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12 11v5M12 8v.01" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          Twoja galeria jest w wersji roboczej. Opublikuj ją, aby klienci mogli ją zobaczyć.
        </p>
        {deleteOn && (
          <p className="draft-del">
            Nieopublikowana galeria zostanie usunięta{" "}
            {new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long" }).format(new Date(deleteOn))}.
          </p>
        )}
      </div>
      <div className="draft-actions">
        <a href={`/galeria/${id}`} target="_blank" rel="noreferrer" className="draft-link">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          Podgląd galerii
        </a>
        <button type="button" className="btn btn-small btn-dark" onClick={open} disabled={photoCount === 0} title={photoCount === 0 ? "Najpierw prześlij zdjęcia" : undefined}>
          Opublikuj
        </button>
        <button type="button" className="btn btn-ghost btn-small" disabled title="Dostępne po opublikowaniu">
          Udostępnij galerię
        </button>
      </div>

      <dialog
        ref={dialogRef}
        className="modal publish-modal"
        aria-labelledby="publish-title"
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close();
        }}
      >
        <div className="modal-body">
          <h2 id="publish-title">Publikujesz galerię</h2>

          <div className="pub-summary">
            <p className="pub-name">{title}</p>
            <div className="pub-meta">
              <span>{photosLabel(photoCount)}</span>
              <span>{formatBytes(usedBytes)}</span>
              {plan && <span className="pub-tag">{plan.name} galeria</span>}
            </div>
          </div>

          {!fit ? (
            <p className="error">
              Galeria zajmuje {formatBytes(usedBytes)} i nie mieści się w największym pakiecie (
              {PLANS[PLANS.length - 1].limitGb.toLocaleString("pl-PL")} GB). Usuń część zdjęć albo podziel sesję na dwie galerie.
            </p>
          ) : (
            <>
              <p className="pub-label">Pakiet</p>
              <div className="pub-plans">
                {PLANS.map((p) => {
                  const fits = usedBytes <= hardLimitBytes(p);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={planId === p.id ? "pub-plan active" : "pub-plan"}
                      disabled={!fits}
                      onClick={() => setPlanId(p.id)}
                      title={fits ? undefined : "Zdjęcia nie mieszczą się w tym pakiecie"}
                    >
                      <strong>{p.name}</strong>
                      <small>do {p.limitGb.toLocaleString("pl-PL")} GB</small>
                    </button>
                  );
                })}
              </div>

              <p className="pub-label">Wybierz okres publikacji</p>
              <div className="pub-periods">
                {PERIODS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={period === n ? "pub-period active" : "pub-period"}
                    onClick={() => setPeriod(n)}
                  >
                    {n === DEFAULT_PERIOD && <span className="pub-badge">Polecane</span>}
                    <b>{n}</b>
                    <span>{n === 1 ? "miesiąc" : n < 5 ? "miesiące" : "miesięcy"}</span>
                    {plan && (
                      <>
                        <em>{plan.prices[n]} zł</em>
                        <small>{perMonth(plan.prices[n], n)}</small>
                      </>
                    )}
                  </button>
                ))}
              </div>

              <p className="pub-label">Podsumowanie kosztu</p>
              <div className="pub-line">
                <span>
                  {plan?.name} galeria × {period} mies.
                </span>
                <span>{zl(price)}</span>
              </div>
              <div className="pub-total">
                <span>Koszt publikacji</span>
                <strong>{zl(price)}</strong>
              </div>
              <p className="pub-permonth">{plan && `To ${perMonth(price, period)}`}</p>
              <InvoiceFields value={invoice} onChange={setInvoice} />
            </>
          )}

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          <button type="button" className="btn btn-wide btn-dark" onClick={publish} disabled={busy || !plan}>
            {busy ? "Przechodzę do płatności…" : `Zapłać ${zl(price)} i opublikuj`}
          </button>
          <p className="test-note">Płatność BLIK, przelewem lub kartą przez Przelewy24.</p>
        </div>
      </dialog>
    </section>
  );
}
