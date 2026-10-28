"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/components/LangProvider";
import { tr, money } from "@/lib/lang";

// Sprzedaż zdjęć: klient wybiera zdjęcia do pakietu, za dodatkowe dopłaca fotografowi
export default function SaleCard({
  id,
  sale,
  watermark,
  hasPayout,
}: {
  id: string;
  sale: { enabled: boolean; included: number; extraPrice: number } | null;
  watermark: boolean;
  hasPayout: boolean;
}) {
  const router = useRouter();
  const lang = useLang();
  const t = (pl: string, en: string) => tr(lang, pl, en);
  const [enabled, setEnabled] = useState(sale?.enabled ?? false);
  const [included, setIncluded] = useState(String(sale?.included ?? 10));
  const [price, setPrice] = useState(String(sale?.extraPrice ?? 20));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const inc = Math.max(0, Math.floor(Number(included) || 0));
  const p = Math.max(0, Number(price.replace(",", ".")) || 0);
  const example = inc + 3;

  async function save() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/galleries/${id}/sale`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", sale: { enabled, included, extraPrice: price } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("Nie udało się zapisać.", "Could not save."));
      setMessage(t("Zapisano.", "Saved."));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Nie udało się zapisać.", "Could not save."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="settings-card" id="sprzedaz">
      <h2>{t("Sprzedaż zdjęć", "Photo sales")}</h2>
      <p>
        {t(
          "Klient wybiera zdjęcia do pakietu z sesji, a za każde kolejne dopłaca Tobie przelewem lub BLIK-iem. Po wpłacie jednym kliknięciem udostępniasz mu zdjęcia bez znaku wodnego.",
          "Your client picks the photos included in the session package and pays you for each extra photo by bank transfer or BLIK. After payment, one click gives them the photos without the watermark.",
        )}
      </p>

      <label className="check">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        {t("Włącz wybór i sprzedaż zdjęć w tej galerii", "Turn on photo selection and sales in this gallery")}
      </label>

      {enabled && (
        <>
          <div className="sale-fields">
            <div>
              <label htmlFor="sale-inc">{t("Zdjęcia w pakiecie", "Photos included")}</label>
              <input id="sale-inc" type="number" min={0} max={2000} inputMode="numeric" value={included} onChange={(e) => setIncluded(e.target.value)} />
            </div>
            <div>
              <label htmlFor="sale-price">{t("Cena dodatkowego zdjęcia (zł)", "Price per extra photo (PLN)")}</label>
              <input id="sale-price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
          </div>
          <p className="hint-inline">
            {inc > 0
              ? t(
                  `Przykład: klient wybiera ${example} zdjęć – ${inc} ma w pakiecie, za 3 dopłaca ${money(3 * p, lang)}.`,
                  `Example: your client picks ${example} photos – ${inc} are included, 3 extra cost ${money(3 * p, lang)}.`,
                )
              : t(`Każde zdjęcie kosztuje ${money(p, lang)}.`, `Each photo costs ${money(p, lang)}.`)}
          </p>
          {!watermark && (
            <p className="warn-inline">
              {t(
                "Włącz znak wodny w „Ochronie zdjęć” powyżej – inaczej klient zobaczy zdjęcia bez zabezpieczenia jeszcze przed zapłatą. Pobieranie jest wyłączone do czasu dostarczenia zamówienia.",
                "Turn on the watermark in “Photo protection” above – otherwise your client sees unprotected photos before paying. Downloads stay off until you deliver the order.",
              )}
            </p>
          )}
          {!hasPayout && (
            <p className="warn-inline">
              {t("Podaj numer konta lub telefon do BLIK, na które klienci mają wpłacać: ", "Add the bank account or BLIK phone your clients should pay to: ")}
              <Link href="/panel/konto?tab=wplaty">{t("Moje konto › Wpłaty od klientów", "My account › Client payments")}</Link>
            </p>
          )}
        </>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {message && <p className="success">{message}</p>}
      <button type="button" className="btn" onClick={save} disabled={busy}>
        {busy ? t("Zapisuję…", "Saving…") : t("Zapisz sprzedaż zdjęć", "Save photo sales")}
      </button>
    </div>
  );
}
