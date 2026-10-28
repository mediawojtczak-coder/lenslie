"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/components/LangProvider";
import { tr, money } from "@/lib/lang";
import PayButtons from "@/components/PayButtons";
import InvoiceFields from "@/components/InvoiceFields";
import type { Billing } from "@/lib/billing";
import type { Theme, ThemeId } from "@/lib/themes";

// Wybór motywu galerii klienta; motywy premium kupuje się raz na konto
export default function ThemeCard({
  id,
  themes,
  current,
  owned,
  balance,
  billing,
}: {
  id: string;
  themes: Theme[];
  current: ThemeId;
  owned: ThemeId[];
  balance: number;
  billing: Billing;
}) {
  const lang = useLang();
  const t = (pl: string, en: string) => tr(lang, pl, en);
  const router = useRouter();
  const [picked, setPicked] = useState<ThemeId>(current);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [invoice, setInvoice] = useState<Billing>(billing);
  const has = (th: Theme) => th.price === 0 || owned.includes(th.id);
  const sel = themes.find((th) => th.id === picked)!;

  async function call(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/galleries/${id}/theme`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Error");
      if (data.redirect) {
        window.location.href = data.redirect;
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="settings-card">
      <h2>{t("Motyw galerii", "Gallery theme")}</h2>
      <p>{t("Wygląd galerii, którą widzi klient. Motyw premium kupujesz raz i używasz we wszystkich galeriach.", "How the gallery looks to your client. Buy a premium theme once and use it in all your galleries.")}</p>
      <div className="theme-grid">
        {themes.map((th) => (
          <button key={th.id} type="button" className={picked === th.id ? "theme-tile active" : "theme-tile"} onClick={() => setPicked(th.id)} aria-pressed={picked === th.id}>
            <span className={`theme-prev tp-${th.id}`} style={{ background: th.swatch[0], color: th.swatch[1] }}>
              <span className="tp-title">Anna &amp; Marek</span>
              <span className="tp-row">
                <i style={{ background: th.swatch[2] }} />
                <i style={{ background: th.swatch[2] }} />
                <i style={{ background: th.swatch[2] }} />
              </span>
            </span>
            <strong>{lang === "en" ? th.nameEn : th.name}</strong>
            <small>{lang === "en" ? th.descEn : th.desc}</small>
            <em>
              {current === th.id ? t("W tej galerii", "In this gallery") : has(th) ? (th.price ? t("Twój", "Owned") : t("Darmowy", "Free")) : money(th.price, lang)}
            </em>
          </button>
        ))}
      </div>
      <a className="as-link" href={`/galeria/${id}?motyw=${picked}`} target="_blank" rel="noreferrer">
        {t("Podejrzyj galerię w tym motywie ›", "Preview the gallery in this theme ›")}
      </a>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {picked !== current &&
        (has(sel) ? (
          <button type="button" className="btn theme-apply" disabled={busy} onClick={() => call({ action: "set", theme: picked })}>
            {busy ? t("Zapisuję…", "Saving…") : t("Użyj w tej galerii", "Use in this gallery")}
          </button>
        ) : (
          <div className="theme-buy">
            <InvoiceFields value={invoice} onChange={setInvoice} />
            <PayButtons
              price={sel.price}
              balance={balance}
              busy={busy}
              label={t("za motyw", "for the theme")}
              onPay={(pay) => call({ action: "buy", theme: picked, pay, invoice })}
            />
          </div>
        ))}
    </div>
  );
}
