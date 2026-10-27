"use client";

import type { Billing } from "@/lib/billing";
import { useTr } from "./LangProvider";

// Pole „Chcę fakturę VAT” z danymi firmy (w oknach płatności i w Moim koncie)
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
  const set = (k: keyof Billing) => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, [k]: e.target.value });
  return (
    <div className="invoice">
      {!alwaysOpen && (
        <label className="check">
          <input type="checkbox" checked={value.want} onChange={(e) => onChange({ ...value, want: e.target.checked })} />
          {t("Chcę fakturę VAT", "I need a VAT invoice")}
        </label>
      )}
      {(value.want || alwaysOpen) && (
        <div className="invoice-grid">
          <label>
            {t("Nazwa firmy", "Company name")}
            <input value={value.company} onChange={set("company")} autoComplete="organization" />
          </label>
          <label>
            {t("NIP", "VAT ID")}
            <input value={value.nip} onChange={set("nip")} inputMode="numeric" placeholder={t("10 cyfr", "Polish NIP, 10 digits")} />
          </label>
          <label className="span2">
            {t("Ulica i numer", "Street address")}
            <input value={value.street} onChange={set("street")} autoComplete="street-address" />
          </label>
          <label>
            {t("Kod pocztowy", "Postcode")}
            <input value={value.postcode} onChange={set("postcode")} autoComplete="postal-code" placeholder="00-000" />
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
