"use client";

import type { Billing } from "@/lib/billing";
import { useLang, useTr } from "./LangProvider";
import { COUNTRIES } from "@/lib/countries";

// Pole „Chcę fakturę VAT” z danymi firmy (w oknach płatności i w Moim koncie).
// W wersji angielskiej: kraj i numer VAT zamiast polskiego NIP-u.
export default function InvoiceFields({
  value,
  onChange,
  alwaysOpen = false,
}: {
  value: Billing;
  onChange: (b: Billing) => void;
  alwaysOpen?: boolean;
}) {
  const t = useTr();
  const lang = useLang();
  const set = (k: keyof Billing) => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, [k]: e.target.value });
  const en = lang === "en";
  const country = value.country ?? (en ? "GB" : "PL");
  const poland = country === "PL";
  return (
    <div className="invoice">
      {!alwaysOpen && (
        <label className="check">
          <input
            type="checkbox"
            checked={value.want}
            onChange={(e) => onChange({ ...value, want: e.target.checked, ...(en && !value.country ? { country } : {}) })}
          />
          {t("Chcę fakturę", "I need an invoice for my business")}
        </label>
      )}
      {(value.want || alwaysOpen) && (
        <div className="invoice-grid">
          {en && (
            <label className="span2">
              Country
              <select value={country} onChange={(e) => onChange({ ...value, country: e.target.value })}>
                {COUNTRIES.map(([k, n]) => (
                  <option key={k} value={k}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            {t("Nazwa firmy", poland ? "Company name" : "Company or full name")}
            <input value={value.company} onChange={set("company")} autoComplete="organization" />
          </label>
          <label>
            {poland ? t("NIP", "Polish NIP") : "VAT number (optional)"}
            <input
              value={value.nip}
              onChange={set("nip")}
              inputMode={poland ? "numeric" : "text"}
              placeholder={poland ? t("10 cyfr", "10 digits") : "e.g. GB123456789"}
            />
          </label>
          <label className="span2">
            {t("Ulica i numer", "Street address")}
            <input value={value.street} onChange={set("street")} autoComplete="street-address" />
          </label>
          <label>
            {t("Kod pocztowy", poland ? "Postcode" : "Postcode / ZIP")}
            <input value={value.postcode} onChange={set("postcode")} autoComplete="postal-code" placeholder={poland ? "00-000" : ""} />
          </label>
          <label>
            {t("Miasto", "City")}
            <input value={value.city} onChange={set("city")} autoComplete="address-level2" />
          </label>
        </div>
      )}
    </div>
  );
}
