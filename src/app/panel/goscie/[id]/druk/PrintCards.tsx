"use client";

import { useTr } from "@/components/LangProvider";
import FancyQr from "@/components/FancyQr";

function Sprig() {
  return (
    <svg className="qc-sprig" viewBox="0 0 220 40" aria-hidden="true">
      <path d="M8 20 H92" />
      <path d="M128 20 H212" />
      <path d="M110 8 C104 14 104 26 110 32 C116 26 116 14 110 8 Z" />
      <path d="M92 20 C86 12 76 10 68 12 C74 18 84 21 92 20 Z" />
      <path d="M92 20 C86 28 76 30 68 28 C74 22 84 19 92 20 Z" />
      <path d="M128 20 C134 12 144 10 152 12 C146 18 136 21 128 20 Z" />
      <path d="M128 20 C134 28 144 30 152 28 C146 22 136 19 128 20 Z" />
    </svg>
  );
}

export default function PrintCards({ title, date, lang, url, studio, back }: { title: string; date: string; lang: "pl" | "en"; url: string; studio: string | null; back: string }) {
  const t = useTr();
  const c = (pl: string, en: string) => (lang === "en" ? en : pl);
  const dateText = date
    ? new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "pl-PL", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`))
    : "";

  return (
    <div className="qr-print">
      <div className="qr-tools">
        <a href={back} className="link-quiet">
          ← {t("Wróć", "Back")}
        </a>
        <p className="hint-inline">
          {t(
            "4 kartki na A4. Najlepiej na grubszym papierze (250–300 g), kremowym lub białym. Przetnij wzdłuż delikatnych linii.",
            "4 cards per A4. Best on heavier paper (250–300 gsm), cream or white. Cut along the faint lines.",
          )}
        </p>
        <button type="button" className="btn btn-small" onClick={() => window.print()}>
          {t("Drukuj", "Print")}
        </button>
      </div>
      <div className="qr-sheet">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="qc">
            <div className="qc-frame">
              <p className="qc-kicker">{c("Podzielcie się zdjęciami", "Share your photos")}</p>
              <Sprig />
              <h2 className="qc-names">{title}</h2>
              {dateText && (
                <p className="qc-date">
                  <span />
                  {dateText}
                  <span />
                </p>
              )}
              <div className="qc-code">
                <i className="qc-corner tl" />
                <i className="qc-corner tr" />
                <i className="qc-corner bl" />
                <i className="qc-corner br" />
                <FancyQr text={url} className="qc-qr" label={c("Kod QR do galerii gości", "QR code to the guest gallery")} />
              </div>
              <p className="qc-lead">
                {c("Zeskanuj kod aparatem telefonu", "Scan the code with your phone camera")}
                <br />
                {c("i dodaj swoje zdjęcia z tego dnia", "and add your photos from today")}
              </p>
              <p className="qc-thanks">{c("Dziękujemy", "Thank you")}</p>
              {studio && <p className="qc-studio">{studio}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
