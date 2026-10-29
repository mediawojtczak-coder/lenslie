"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import InvoiceFields from "@/components/InvoiceFields";
import { useLang } from "@/components/LangProvider";
import { tr, money, locale } from "@/lib/lang";
import { planName } from "@/lib/plans";
import PayButtons from "@/components/PayButtons";
import type { Billing } from "@/lib/billing";
import { PLANS, PERIODS, DEFAULT_PERIOD, fitPlan, formatBytes, perMonthL, hardLimitBytes, type Period, type PlanId } from "@/lib/plans";

function photosLabelPl(n: number) {
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
  balance,
  pro = null,
}: {
  id: string;
  title: string;
  photoCount: number;
  usedBytes: number;
  deleteOn?: string | null;
  billing: Billing;
  balance: number;
  // aktywny abonament Pro: publikacja bez opłaty
  pro?: { name: string; usedBytes: number; limitBytes: number } | null;
}) {
  const [invoice, setInvoice] = useState<Billing>(billing);
  const lang = useLang();
  const t = (pl: string, en: string) => tr(lang, pl, en);
  const zl = (n: number) => money(n, lang, true);
  const photosLabel = (n: number) => (lang === "en" ? (n === 1 ? "1 photo" : `${n} photos`) : photosLabelPl(n));
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

  async function publishPro() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/galleries/${id}/plan`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "pro" }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("Nie udało się opublikować galerii.", "Could not publish the gallery."));
      dialogRef.current?.close();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Nie udało się opublikować galerii.", "Could not publish the gallery."));
    } finally {
      setBusy(false);
    }
  }

  async function publish(pay: "wallet" | "p24") {
    if (!plan) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/galleries/${id}/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "choose", plan: plan.id, period, invoice, pay }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("Nie udało się opublikować galerii.", "Could not publish the gallery."));
      if (data.redirect) {
        window.location.href = data.redirect;
        return;
      }
      dialogRef.current?.close();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Nie udało się opublikować galerii.", "Could not publish the gallery."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="draft-bar">
      <div className="draft-text">
        <p className="draft-title">{t("Wersja robocza", "Draft")}</p>
        <p className="draft-note">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12 11v5M12 8v.01" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          {t("Twoja galeria jest w wersji roboczej. Opublikuj ją, aby klienci mogli ją zobaczyć.", "Your gallery is a draft. Publish it so your clients can see it.")}
        </p>
        {deleteOn && (
          <p className="draft-del">
            {t("Nieopublikowana galeria zostanie usunięta", "This unpublished gallery will be deleted on")}{" "}
            {new Intl.DateTimeFormat(locale(lang), { day: "numeric", month: "long" }).format(new Date(deleteOn))}.
          </p>
        )}
      </div>
      <div className="draft-actions">
        <a href={`/galeria/${id}`} target="_blank" rel="noreferrer" className="draft-link">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          {t("Podgląd galerii", "Preview gallery")}
        </a>
        <button type="button" className="btn btn-small btn-dark" onClick={open} disabled={photoCount === 0} title={photoCount === 0 ? t("Najpierw prześlij zdjęcia", "Upload photos first") : undefined}>
          {t("Opublikuj", "Publish")}
        </button>
        <button type="button" className="btn btn-ghost btn-small" disabled title={t("Dostępne po opublikowaniu", "Available after publishing")}>
          {t("Udostępnij galerię", "Share gallery")}
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
          <h2 id="publish-title">{t("Publikujesz galerię", "Publish gallery")}</h2>

          <div className="pub-summary">
            <p className="pub-name">{title}</p>
            <div className="pub-meta">
              <span>{photosLabel(photoCount)}</span>
              <span>{formatBytes(usedBytes)}</span>
              {plan && <span className="pub-tag">{lang === "en" ? `${planName(plan, lang)} gallery` : `${plan.name} galeria`}</span>}
            </div>
          </div>

          {pro ? (
            <div className="pub-pro">
              <p>
                <span className="pro-chip">Pro</span>
                {t(`Publikujesz w abonamencie ${pro.name} – bez dodatkowej opłaty.`, `You're publishing with your ${pro.name} subscription – no extra charge.`)}
              </p>
              <p className="hint-inline">
                {t(
                  `Galeria będzie dostępna dla klienta, dopóki trwa abonament. Wszystkie galerie zajmują ${formatBytes(pro.usedBytes)} z ${formatBytes(pro.limitBytes)}.`,
                  `Your client can open the gallery while the subscription lasts. All galleries use ${formatBytes(pro.usedBytes)} of ${formatBytes(pro.limitBytes)}.`,
                )}
              </p>
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <button type="button" className="btn btn-dark" onClick={publishPro} disabled={busy}>
                {busy ? t("Publikuję…", "Publishing…") : t("Opublikuj galerię", "Publish gallery")}
              </button>
            </div>
          ) : !fit ? (
            <p className="error">
              {t("Galeria zajmuje", "The gallery takes up")} {formatBytes(usedBytes)}{" "}
              {t("i nie mieści się w największym pakiecie", "and does not fit the largest plan")} ({PLANS[PLANS.length - 1].limitGb} GB).{" "}
              {t("Usuń część zdjęć albo podziel sesję na dwie galerie.", "Remove some photos or split the session into two galleries.")}
            </p>
          ) : (
            <>
              <p className="pub-label">{t("Pakiet", "Plan")}</p>
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
                      title={fits ? undefined : t("Zdjęcia nie mieszczą się w tym pakiecie", "Your photos don’t fit this plan")}
                    >
                      <strong>{planName(p, lang)}</strong>
                      <small>{t("do", "up to")} {p.limitGb.toLocaleString(locale(lang))} GB</small>
                    </button>
                  );
                })}
              </div>

              <p className="pub-label">{t("Wybierz okres publikacji", "Choose the publishing period")}</p>
              <div className="pub-periods">
                {PERIODS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={period === n ? "pub-period active" : "pub-period"}
                    onClick={() => setPeriod(n)}
                  >
                    {n === DEFAULT_PERIOD && <span className="pub-badge">{t("Polecane", "Recommended")}</span>}
                    <b>{n}</b>
                    <span>{lang === "en" ? (n === 1 ? "month" : "months") : n === 1 ? "miesiąc" : n < 5 ? "miesiące" : "miesięcy"}</span>
                    {plan && (
                      <>
                        <em>{money(plan.prices[n], lang)}</em>
                        <small>{perMonthL(plan.prices[n], n, lang)}</small>
                      </>
                    )}
                  </button>
                ))}
              </div>

              <p className="pub-label">{t("Podsumowanie kosztu", "Cost summary")}</p>
              <div className="pub-line">
                <span>
                  {plan && (lang === "en" ? `${planName(plan, lang)} gallery × ${period} mo.` : `${plan.name} galeria × ${period} mies.`)}
                </span>
                <span>{zl(price)}</span>
              </div>
              <div className="pub-total">
                <span>{t("Koszt publikacji", "Total")}</span>
                <strong>{zl(price)}</strong>
              </div>
              <p className="pub-permonth">{plan && `${t("To", "That is")} ${perMonthL(price, period, lang)}`}</p>
              <InvoiceFields value={invoice} onChange={setInvoice} />
            </>
          )}

          {!pro && error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          {!pro && <PayButtons price={price} balance={balance} busy={busy} disabled={!plan} label={t("i opublikuj", "and publish")} onPay={publish} />}
        </div>
      </dialog>
    </section>
  );
}
