"use client";

import { useState } from "react";
import Link from "next/link";
import { PLANS, PERIODS, DEFAULT_PERIOD, periodLabel, type Period } from "@/lib/plans";

const fmtPrice = (n: number) => n.toLocaleString("pl-PL", { maximumFractionDigits: 2 });
const fmtGb = (n: number) => `${n.toLocaleString("pl-PL")} GB`;

// Karty pakietów z przełącznikiem okresu publikacji
export default function PricingPlans() {
  const [period, setPeriod] = useState<Period>(DEFAULT_PERIOD);

  return (
    <div className="pricing-block">
      <div className="period-switch" role="radiogroup" aria-label="Okres dostępu dla klienta">
        {PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={period === p}
            className={period === p ? "period active" : "period"}
            onClick={() => setPeriod(p)}
          >
            {p === 1 ? "1 mies." : `${p} mies.`}
          </button>
        ))}
      </div>

      <section className="plans" aria-label="Pakiety">
        {PLANS.map((plan) => (
          <article key={plan.id} className={plan.featured ? "plan featured" : "plan"}>
            {plan.featured && <p className="plan-flag">Najczęściej wybierana</p>}
            <h3>{plan.name}</h3>
            <p className="plan-for">{plan.forWhom}</p>
            <p className="plan-price">
              <span className="amount">{fmtPrice(plan.prices[period])} zł</span>
              <span className="per">za galerię</span>
            </p>
            <ul className="plan-facts">
              <li>
                <strong>do {fmtGb(plan.limitGb)}</strong> {plan.photos} w pełnej rozdzielczości
              </li>
              <li>
                <strong>{periodLabel(period)}</strong> dostępu dla klienta
              </li>
              <li>Wszystkie funkcje w cenie, bez abonamentu</li>
            </ul>
            <Link href="/logowanie" className={plan.featured ? "btn btn-wide" : "btn btn-ghost btn-wide"}>
              Wybieram {plan.name.toLowerCase()}
            </Link>
          </article>
        ))}
      </section>
    </div>
  );
}
