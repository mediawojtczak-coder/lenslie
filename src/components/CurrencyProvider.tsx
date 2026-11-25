"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Cur } from "@/lib/foreign-prices";

// Waluta płatności Stripe dla zalogowanego fotografa (angielska wersja) albo null – złotówki i Przelewy24
const Ctx = createContext<Cur | null>(null);

export function CurrencyProvider({ cur, children }: { cur: Cur | null; children: ReactNode }) {
  return <Ctx.Provider value={cur}>{children}</Ctx.Provider>;
}

export const useCur = () => useContext(Ctx);
