"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useTr } from "@/components/LangProvider";

export default function PrintCards({ title, date, lang, url, studio, back }: { title: string; date: string; lang: "pl" | "en"; url: string; studio: string | null; back: string }) {
  const t = useTr();
  const c = (pl: string, en: string) => (lang === "en" ? en : pl);
  const [qr, setQr] = useState("");
  useEffect(() => {
    QRCode.toDataURL(url, { width: 900, margin: 1, color: { dark: "#3b3633", light: "#ffffff" } }).then(setQr).catch(() => setQr(""));
  }, [url]);
  const dateText = date
    ? new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "pl-PL", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`))
    : "";

  return (
    <div className="qr-print">
      <div className="qr-tools">
        <a href={back} className="link-quiet">
          ← {t("Wróć", "Back")}
        </a>
        <p className="hint-inline">{t("4 kartki na stronie A4 – wydrukuj i przetnij na pół w obu kierunkach.", "4 cards per A4 page – print and cut in half both ways.")}</p>
        <button type="button" className="btn btn-small" onClick={() => window.print()} disabled={!qr}>
          {t("Drukuj", "Print")}
        </button>
      </div>
      <div className="qr-sheet">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="qr-card">
            <p className="qr-kicker">{c("Zdjęcia od gości", "Guest photos")}</p>
            <h2>{title}</h2>
            {dateText && <p className="qr-date">{dateText}</p>}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {qr && <img src={qr} alt="" />}
            <p className="qr-lead">{c("Zeskanuj kod aparatem telefonu i dodaj swoje zdjęcia z tego dnia. Dziękujemy!", "Scan the code with your phone camera and add your photos from today. Thank you!")}</p>
            {studio && <p className="qr-url">{studio}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
