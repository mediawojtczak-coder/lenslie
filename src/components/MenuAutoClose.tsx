"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Rozwijane menu (<details>): zamyka się po kliknięciu pozycji, kliknięciu obok, klawiszu Esc i po przejściu na inną stronę
export default function MenuAutoClose({ selector = "details.account" }: { selector?: string }) {
  const pathname = usePathname();

  useEffect(() => {
    document.querySelectorAll<HTMLDetailsElement>(`${selector}[open]`).forEach((d) => d.removeAttribute("open"));
  }, [pathname, selector]);

  useEffect(() => {
    const closeAll = (except?: Element | null) =>
      document.querySelectorAll<HTMLDetailsElement>(`${selector}[open]`).forEach((d) => {
        if (d !== except) d.removeAttribute("open");
      });
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      const menu = target?.closest?.(selector);
      if (!menu) return closeAll(); // klik obok menu
      // klik w link albo przycisk w środku menu (nie w samo „A” otwierające menu i nie w przełącznik języka)
      if (target?.closest("summary")) return;
      if (target?.closest("a, button[type=submit]")) setTimeout(() => closeAll(), 0);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAll();
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [selector]);

  return null;
}
