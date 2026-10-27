"use client";

import { useState } from "react";
import Link from "next/link";
import { PLANS, PERIODS, DEFAULT_PERIOD, planName, planPhotos, planFor, periodText, periodShort, perMonthL, type Period } from "@/lib/plans";
import { useLang } from "./LangProvider";
import { tr, money } from "@/lib/lang";


// Karty pakietów z przełącznikiem okresu publikacji
export default function PricingPlans() {
  const [period, setPeriod] = useState<Period>(DEFAULT_PERIOD);
  const lang = useLang();
  const t = (pl: string, en: string) => tr(lang, pl, en);
  const fmtGb = (n: number) => `${n.toLocaleString(lang === "en" ? "en-GB" : "pl-PL")} GB`;

  return (
    <div className="pricing-block">
      <div className="period-switch" role="radiogroup" aria-label={t("Okres dostępu dla klienta", "Client access period")}>
        {PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={period === p}
            className={period === p ? "period active" : "period"}
            onClick={() => setPeriod(p)}
          >
            {periodShort(p, lang)}
          </button>
        ))}
      </div>

      <section className="plans" aria-label={t("Pakiety", "Plans")}>
        {PLANS.map((plan) => (
          <article key={plan.id} className={plan.featured ? "plan featured" : "plan"}>
            {plan.featured && <p className="plan-flag">{t("Najczęściej wybierana", "Most popular")}</p>}
            <h3>{planName(plan, lang)}</h3>
            <p className="plan-for">{planFor(plan, lang)}</p>
            <p className="plan-price">
              <span className="amount">{money(plan.prices[period], lang)}</span>
              <span className="per">{t("za galerię", "per gallery")}</span>
            </p>
            {period > 1 && <p className="plan-month">{t("czyli", "that is")} {perMonthL(plan.prices[period], period, lang)}</p>}
            <ul className="plan-facts">
              <li>
                <strong>{t("do", "up to")} {fmtGb(plan.limitGb)}</strong> {planPhotos(plan, lang)} {t("w pełnej rozdzielczości", "in full resolution")}
              </li>
              <li>
                <strong>{periodText(period, lang)}</strong> {t("dostępu dla klienta", "of client access")}
              </li>
              <li>{t("Wszystkie funkcje w cenie, bez abonamentu", "All features included, no subscription")}</li>
            </ul>
            <Link href="/rejestracja" className={plan.featured ? "btn btn-wide" : "btn btn-ghost btn-wide"}>
              {t("Wybieram pakiet", "Choose")} {planName(plan, lang)}
            </Link>
          </article>
        ))}
      </section>
    </div>
  );
}
