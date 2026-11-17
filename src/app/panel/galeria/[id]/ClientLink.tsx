"use client";

import { useState } from "react";
import { useTr } from "@/components/LangProvider";

// Osobisty link klienta do jego wyboru i zamówienia – działa w każdej przeglądarce, bez ponownego hasła
export default function ClientLink({ url }: { url: string }) {
  const t = useTr();
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="as-link client-link"
      title={url}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        } catch {
          window.prompt(t("Skopiuj link:", "Copy the link:"), url);
        }
      }}
    >
      {done ? t("Skopiowano ✓", "Copied ✓") : t("Kopiuj link klienta do zamówienia", "Copy client's order link")}
    </button>
  );
}
