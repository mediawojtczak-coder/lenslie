import FancyQr from "@/components/FancyQr";
import type { FeatureVisual as V } from "@/lib/features";

const ph = (n: number) => `url(/home/foto-${n}.jpg)`;

// Ilustracje do stron reklamowych funkcji (makiety z CSS, bez zdjęć klientów)
export default function FeatureVisual({ visual, lang, small = false }: { visual: V; lang: "pl" | "en"; small?: boolean }) {
  const t = (pl: string, en: string) => (lang === "en" ? en : pl);
  const cls = `fv fv-${visual}${small ? " fv-small" : ""}`;

  switch (visual) {
    case "album":
      return (
        <div className={cls} aria-hidden="true">
          <div className="fv-spread blur" style={{ ["--bg" as string]: ph(1) }}>
            <span className="fv-ph framed" style={{ left: "8%", top: "12%", width: "34%", height: "58%", backgroundImage: ph(1) }} />
            <span className="fv-ph framed up" style={{ left: "27%", top: "48%", width: "18%", height: "42%", backgroundImage: ph(4) }} />
            <span className="fv-ph framed" style={{ left: "60%", top: "14%", width: "28%", height: "72%", backgroundImage: ph(2) }} />
          </div>
          <div className="fv-spread">
            <span className="fv-ph" style={{ left: "0", top: "0", width: "50%", height: "100%", backgroundImage: ph(7) }} />
            <span className="fv-ph framed" style={{ left: "60%", top: "16%", width: "30%", height: "68%", backgroundImage: ph(6) }} />
          </div>
        </div>
      );
    case "print":
      return (
        <div className={cls} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/album/druk-hero.jpg" alt="" className="fv-photo" />
        </div>
      );
    case "lightroom":
      return (
        <div className={cls} aria-hidden="true">
          <div className="lr-mock">
            <div className="lr-mock-panel">
              <p className="lr-mock-h">{t("Usługi publikowania", "Publish Services")}</p>
              <p className="lr-mock-svc">
                <span className="lr-mock-ico">L</span> Lenslie
              </p>
              <p className="lr-mock-col on">
                {t("Ślub Anny i Marka", "Anna & Mark wedding")} <em>412</em>
              </p>
              <p className="lr-mock-col">
                {t("Sesja rodzinna", "Family session")} <em>86</em>
              </p>
              <p className="lr-mock-col">
                {t("Chrzest Zosi", "Zosia's christening")} <em>154</em>
              </p>
            </div>
            <span className="lr-mock-arrow">→</span>
            <div className="lr-mock-gallery">
              {[1, 4, 2, 7, 3, 6].map((n, i) => (
                <span key={i} style={{ backgroundImage: ph(n) }} />
              ))}
            </div>
          </div>
        </div>
      );
    case "qr":
      return (
        <div className={cls} aria-hidden="true">
          <div className="fv-qrcard">
            <div className="fv-qrframe">
              <p className="fv-qr-k">{t("Podzielcie się zdjęciami", "Share your photos")}</p>
              <p className="fv-qr-n">Anna &amp; Marek</p>
              <p className="fv-qr-d">14 · 09 · 2026</p>
              <FancyQr text="https://www.lenslie.com" className="fv-qr" />
              <p className="fv-qr-t">{t("Dziękujemy", "Thank you")}</p>
            </div>
          </div>
        </div>
      );
    case "sale":
      return (
        <div className={cls} aria-hidden="true">
          <div className="fv-phone">
            <div className="fv-screen">
              <div className="fv-grid">
                {[1, 2, 4, 3, 6, 7, 5, 1, 2].map((n, i) => (
                  <span key={i} className={i % 3 === 0 ? "on" : ""} style={{ backgroundImage: ph(n) }}>
                    {i % 3 === 0 && <i>♥</i>}
                  </span>
                ))}
              </div>
              <div className="fv-cart">
                <span>{t("33 zdjęcia · 3 dodatkowe", "33 photos · 3 extra")}</span>
                <strong>{t("60 zł", "PLN 60")}</strong>
              </div>
            </div>
          </div>
        </div>
      );
    case "portfolio":
    case "domain":
      return (
        <div className={cls} aria-hidden="true">
          <div className="fv-browser">
            <div className="fv-bar">
              <i />
              <i />
              <i />
              <span>{visual === "domain" ? "galerie.twojestudio.pl/anna-marek" : "lenslie.com/p/twoje-studio"}</span>
            </div>
            <div className="fv-site" style={{ backgroundImage: ph(visual === "domain" ? 2 : 1) }}>
              <div>
                <span className="fv-ring">{visual === "domain" ? "A & M" : "TS"}</span>
                <strong>{visual === "domain" ? "Anna & Marek" : t("Twoje Studio", "Your Studio")}</strong>
                <small>{visual === "domain" ? "14 · 09 · 2026" : t("Fotografia ślubna", "Wedding photography")}</small>
              </div>
            </div>
          </div>
        </div>
      );
    case "booking":
      return (
        <div className={cls} aria-hidden="true">
          <div className="fv-cal">
            <p className="fv-cal-h">{t("Świąteczne sesje mini · 14 grudnia", "Holiday mini sessions · 14 December")}</p>
            <div className="fv-slots">
              {["10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00"].map((h, i) => (
                <span key={h} className={[1, 2, 5, 7].includes(i) ? "taken" : i === 3 ? "pick" : ""}>
                  {h}
                </span>
              ))}
            </div>
            <div className="fv-cal-ok">
              <b>✓</b> {t("Zarezerwowano 11:30 – potwierdzenie wysłane", "Booked 11:30 – confirmation sent")}
            </div>
          </div>
        </div>
      );
    case "video":
      return (
        <div className={cls} aria-hidden="true">
          <div className="fv-video" style={{ backgroundImage: ph(3) }}>
            <span className="fv-play">▶</span>
            <span className="fv-time">04:12 / 12:48</span>
          </div>
          <div className="fv-dl">↓ {t("Pobierz film w oryginalnej jakości · 4,2 GB", "Download the film in original quality · 4.2 GB")}</div>
        </div>
      );
    case "themes":
      return (
        <div className={cls} aria-hidden="true">
          {[
            { k: "noir", n: t("Czarny elegancki", "Noir") },
            { k: "minimal", n: t("Minimalistyczny", "Minimal") },
            { k: "rustic", n: t("Rustykalny ślubny", "Rustic wedding") },
          ].map((th, i) => (
            <div key={th.k} className={`fv-theme ${th.k}`}>
              <p>{th.n}</p>
              <div>
                {[1, 2, 3, 4].map((n) => (
                  <span key={n} style={{ backgroundImage: ph(((n + i * 2) % 7) + 1) }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    case "app":
      return (
        <div className={cls} aria-hidden="true">
          <div className="fv-appwin">
            <div className="fv-appbar">
              <i />
              <i />
              <i />
              <span>Lenslie</span>
            </div>
            <div className="fv-appbody">
              <div className="fv-appside">
                <b>Lenslie</b>
                <span className="on" />
                <span />
                <span />
                <span />
              </div>
              <div className="fv-appgrid">
                {[1, 2, 3, 4, 6, 7].map((n) => (
                  <span key={n} style={{ backgroundImage: ph(n) }} />
                ))}
              </div>
            </div>
          </div>
          <div className="fv-dock">
            {["#4a90e2", "#e9e5e1", "#34c759"].map((c) => (
              <i key={c} style={{ background: c }} />
            ))}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon-192.png" alt="" />
            {["#ff9f0a", "#bf5af2"].map((c) => (
              <i key={c} style={{ background: c }} />
            ))}
          </div>
        </div>
      );
    case "faces":
    default:
      return (
        <div className={cls} aria-hidden="true">
          <div className="fv-phone">
            <div className="fv-screen">
              <div className="fv-found">{t("Znaleziono 5 zdjęć z Tobą", "Found 5 photos of you")}</div>
              <div className="fv-grid">
                {[1, 3, 2, 6, 4, 5, 7, 3, 1].map((n, i) => (
                  <span key={i} className={i % 2 === 0 ? "on" : "dim"} style={{ backgroundImage: ph(n) }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      );
  }
}
