// Stałe koszty utrzymania Lenslie – uzupełnij kwotami z faktur (panel administratora liczy je proporcjonalnie do liczby dni).
// monthlyUsd / monthlyPln / yearlyPln / dailyPln – podaj jedną wartość. `from` – od kiedy koszt obowiązuje.
export type FixedCost = { name: string; note?: string; monthlyUsd?: number; monthlyPln?: number; yearlyPln?: number; dailyPln?: number; from?: string };

export const FIXED_COSTS: FixedCost[] = [
  { name: "Vercel Pro (hosting)", note: "20 USD/mies. – wymagany przy użyciu komercyjnym", monthlyUsd: 20 },
  { name: "Google Ads", note: "budżet 25 zł/dzień – maksymalny, faktyczny wydatek w Google Ads", dailyPln: 25, from: "2026-10-30" },
  { name: "Domena lenslie.com", note: "ok. 60 zł rocznie – sprawdź fakturę rejestratora", yearlyPln: 60 },
  { name: "Supabase (logowanie)", note: "plan darmowy", monthlyPln: 0 },
  { name: "Resend (e-maile)", note: "plan darmowy do 3000 maili/mies.", monthlyPln: 0 },
];

// Koszt stały w złotych za okres [start, end)
export function fixedCostFor(c: FixedCost, start: Date, end: Date, usdPln: number) {
  const from = c.from ? new Date(c.from) : start;
  const s = Math.max(start.getTime(), from.getTime());
  const days = Math.max(0, (end.getTime() - s) / (24 * 3600 * 1000));
  const perDay =
    c.dailyPln ?? (c.monthlyUsd !== undefined ? (c.monthlyUsd * usdPln) / 30.44 : c.monthlyPln !== undefined ? c.monthlyPln / 30.44 : (c.yearlyPln ?? 0) / 365);
  return perDay * days;
}
