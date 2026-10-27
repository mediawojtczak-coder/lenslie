import { getOrder } from "@/lib/p24";
import RefreshSoon from "./RefreshSoon";
import { getLang } from "@/lib/lang-server";
import { tr } from "@/lib/lang";


// Komunikat po powrocie ze strony Przelewy24
export default async function PaymentNotice({ sessionId, galleryId }: { sessionId: string; galleryId: string }) {
  const order = await getOrder(sessionId);
  const t = (pl: string, en: string) => tr(lang, pl, en);
  const lang = await getLang();
  if (!order || order.galleryId !== galleryId) return null;
  if (order.status === "paid") {
    return <p className="success-box pay-note">{t("Płatność przyjęta. Dziękujemy! Zmiany są już aktywne.", "Payment received. Thank you! The changes are now active.")}</p>;
  }
  return (
    <p className="warn-inline pay-note">
      {t("Czekamy na potwierdzenie płatności od Przelewy24. Zwykle trwa to kilka sekund, strona odświeży się sama.", "Waiting for payment confirmation from Przelewy24. It usually takes a few seconds; the page refreshes by itself.")}
      <RefreshSoon />
    </p>
  );
}
