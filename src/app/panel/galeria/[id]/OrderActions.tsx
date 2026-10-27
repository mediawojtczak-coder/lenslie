"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTr } from "@/components/LangProvider";
import type { OrderStatus } from "@/lib/sales";

// Obsługa zamówienia: wpłata otrzymana → udostępnienie zdjęć bez znaku wodnego
export default function OrderActions({
  galleryId,
  selection,
  status,
  total,
}: {
  galleryId: string;
  selection: string;
  status: OrderStatus;
  total: number;
}) {
  const t = useTr();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(action: "paid" | "deliver" | "reopen") {
    if (action === "reopen" && !window.confirm(t("Cofnąć zamówienie? Klient będzie mógł znów zmienić wybór i złożyć je od nowa.", "Undo the order? Your client will be able to change the selection and order again."))) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/galleries/${galleryId}/sale`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, selection }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? t("Coś poszło nie tak.", "Something went wrong."));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Coś poszło nie tak.", "Something went wrong."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="order-actions">
      {status === "ordered" && total > 0 && (
        <button type="button" className="btn btn-ghost btn-small" disabled={busy} onClick={() => run("paid")}>
          {t("Wpłata otrzymana", "Payment received")}
        </button>
      )}
      {status !== "delivered" && (
        <button type="button" className="btn btn-small" disabled={busy} onClick={() => run("deliver")}>
          {t("Udostępnij zdjęcia", "Deliver photos")}
        </button>
      )}
      {status !== "delivered" && (
        <button type="button" className="as-link" disabled={busy} onClick={() => run("reopen")}>
          {t("Cofnij zamówienie", "Undo order")}
        </button>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
