"use client";

import type { Billing } from "@/lib/billing";

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
  const set = (k: keyof Billing) => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, [k]: e.target.value });
  return (
    <div className="invoice">
      {!alwaysOpen && (
        <label className="check">
          <input type="checkbox" checked={value.want} onChange={(e) => onChange({ ...value, want: e.target.checked })} />
          Chcę fakturę VAT
        </label>
      )}
      {(value.want || alwaysOpen) && (
        <div className="invoice-grid">
          <label>
            Nazwa firmy
            <input value={value.company} onChange={set("company")} autoComplete="organization" />
          </label>
          <label>
            NIP
            <input value={value.nip} onChange={set("nip")} inputMode="numeric" placeholder="10 cyfr" />
          </label>
          <label className="span2">
            Ulica i numer
            <input value={value.street} onChange={set("street")} autoComplete="street-address" />
          </label>
          <label>
            Kod pocztowy
            <input value={value.postcode} onChange={set("postcode")} autoComplete="postal-code" placeholder="00-000" />
          </label>
          <label>
            Miasto
            <input value={value.city} onChange={set("city")} autoComplete="address-level2" />
          </label>
        </div>
      )}
    </div>
  );
}
