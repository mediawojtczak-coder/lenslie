"use client";

import { useEffect } from "react";

// Na telefonie wiersz tabeli pokazuje najważniejsze pola; dotknięcie wiersza rozwija resztę
export default function RowToggle() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as Element | null;
      if (!t || t.closest("a, button, input, select, textarea, form, summary, label")) return;
      const tr = t.closest(".admin-table tbody tr");
      if (tr) tr.classList.toggle("open");
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  return null;
}
