import Link from "next/link";

// Mała reklama „Zdjęć od gości” w lewym menu panelu
export default function QrPromo({ lang }: { lang: "pl" | "en" }) {
  const t = (pl: string, en: string) => (lang === "en" ? en : pl);
  return (
    <Link href="/panel/goscie/oferta" className="qr-promo">
      <span className="qr-promo-badge">{t("Nowość", "New")}</span>
      <span className="qr-promo-card" aria-hidden="true">
        <span className="qr-promo-names">Anna &amp; Marek</span>
        <span className="qr-promo-code">
          {Array.from({ length: 25 }, (_, i) => (
            <i key={i} className={[0, 1, 3, 4, 5, 9, 12, 15, 19, 20, 21, 23, 24, 7, 17].includes(i) ? "on" : ""} />
          ))}
        </span>
      </span>
      <strong>{t("Kody QR na stoły", "QR codes for tables")}</strong>
      <small>{t("Goście wrzucają zdjęcia i filmy z wesela – bez aplikacji.", "Guests upload wedding photos and videos – no app.")}</small>
      <em>{t("Zobacz ofertę · 99 zł ›", "See offer · PLN 99 ›")}</em>
    </Link>
  );
}
