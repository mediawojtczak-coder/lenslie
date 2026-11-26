"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Cur } from "@/lib/foreign-prices";

// Waluta płatności Stripe dla zalogowanego fotografa (angielska wersja) albo null – złotówki i Przelewy24.
// balance – saldo w tej walucie (centy/pensy)
const Ctx = createContext<{ cur: Cur | null; balance: number }>({ cur: null, balance: 0 });

export function CurrencyProvider({ cur, balance = 0, children }: { cur: Cur | null; balance?: number; children: ReactNode }) {
  return <Ctx.Provider value={{ cur, balance }}>{children}</Ctx.Provider>;
}

export const useCur = () => useContext(Ctx).cur;
export const useCurBalance = () => useContext(Ctx).balance;
