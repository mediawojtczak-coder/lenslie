"use client";

import { createContext, useContext, type ReactNode } from "react";
import { tr, type SiteLang } from "@/lib/lang";

const Ctx = createContext<SiteLang>("pl");

export function LangProvider({ lang, children }: { lang: SiteLang; children: ReactNode }) {
  return <Ctx.Provider value={lang}>{children}</Ctx.Provider>;
}

export const useLang = () => useContext(Ctx);

// t("polski", "English")
export function useTr() {
  const lang = useContext(Ctx);
  return (pl: string, en: string) => tr(lang, pl, en);
}
