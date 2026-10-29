"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLang } from "@/components/LangProvider";
import { tr, locale } from "@/lib/lang";
import { formatBytes } from "@/lib/plans";

// Galeria w abonamencie Pro (pasek z pulą miejsca) albo propozycja przeniesienia opłaconej galerii do abonamentu
export default function ProGalleryBar({
  id,
  mode,
  name,
  usedBytes,
  limitBytes,
  active,
  paidUntil,
  expiresAt,
}: {
  id: string;
  mode: "pro" | "move";
  name: string;
  usedBytes: number;
  limitBytes: number;
  active: boolean;
  paidUntil: string | null;
  expiresAt: string | null;
}) {
  const lang = useLang();
  const t = (pl: string, en: string) => tr(lang, pl, en);
  const dateFmt = new Intl.DateTimeFormat(locale(lang), { day: "numeric", month: "long", year: "numeric" });
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const share = limitBytes ? Math.min(1, usedBytes / limitBytes) : 0;

  async function move() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/galleries/${id}/plan`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "pro" }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Error");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  if (mode === "move") {
    return (
      <div className="pro-move">
        <p>
          <span className="pro-chip">Pro</span>
          {t(
            `Przenieś tę galerię do abonamentu ${name} – nie wygaśnie, dopóki trwa abonament, a jej miejsce wliczy się do puli.`,
            `Move this gallery to your ${name} subscription – it won't expire while the subscription lasts, and its space counts towards your pool.`,
          )}
        </p>
        <button type="button" className="btn btn-small btn-dark" onClick={move} disabled={busy}>
          {busy ? t("Przenoszę…", "Moving…") : t("Przenieś do Pro", "Move to Pro")}
        </button>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <section className="plan-bar pro-bar">
      <div className="plan-info">
        <p className="plan-name">
          <span className="pro-chip">Pro</span> {t("Galeria w abonamencie", "Gallery in your")} <strong>{name}</strong>
          {lang === "en" && " subscription"}
        </p>
        <div className={share >= 1 ? "usage full" : share > 0.85 ? "usage warn" : "usage"}>
          <div className="usage-bar">
            <span style={{ width: `${Math.max(2, share * 100)}%` }} />
          </div>
          <p>
            {formatBytes(usedBytes)} {t("z", "of")} {formatBytes(limitBytes)} {t("na wszystkie galerie", "across all galleries")}
          </p>
        </div>
        {active ? (
          <p className="plan-exp">
            {t("Galeria jest dostępna dla klienta, dopóki trwa abonament", "Clients can open this gallery while your subscription lasts")}
            {paidUntil && ` (${t("opłacony do", "paid until")} ${dateFmt.format(new Date(paidUntil))})`}.
          </p>
        ) : (
          <p className="plan-exp expired">
            {t("Abonament się skończył – galeria działa do ", "Your subscription has ended – the gallery works until ")}
            {expiresAt ? dateFmt.format(new Date(expiresAt)) : "–"}. {t("Odnów go, aby dodawać zdjęcia.", "Renew it to add photos.")}
          </p>
        )}
      </div>
      <div className="plan-actions">
        <Link href="/panel/pro" className="btn btn-ghost btn-small">
          {active ? t("Abonament", "Subscription") : t("Odnów abonament", "Renew subscription")}
        </Link>
      </div>
    </section>
  );
}
