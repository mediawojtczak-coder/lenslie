"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTr } from "@/components/LangProvider";

// Wylogowanie wtyczki Lightroom na wszystkich komputerach (np. po sprzedaży laptopa)
export default function RevokeButton() {
  const t = useTr();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-ghost btn-small"
      disabled={busy}
      onClick={async () => {
        if (!window.confirm(t("Wylogować Lightroom na wszystkich komputerach?", "Sign Lightroom out on all computers?"))) return;
        setBusy(true);
        await fetch("/api/lr/revoke", { method: "POST" }).catch(() => null);
        setBusy(false);
        router.refresh();
      }}
    >
      {t("Wyloguj wszędzie", "Sign out everywhere")}
    </button>
  );
}
