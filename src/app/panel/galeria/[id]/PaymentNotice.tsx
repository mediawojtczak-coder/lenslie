import { getOrder } from "@/lib/p24";
import RefreshSoon from "./RefreshSoon";

// Komunikat po powrocie ze strony Przelewy24
export default async function PaymentNotice({ sessionId, galleryId }: { sessionId: string; galleryId: string }) {
  const order = await getOrder(sessionId);
  if (!order || order.galleryId !== galleryId) return null;
  if (order.status === "paid") {
    return <p className="success-box pay-note">Płatność przyjęta. Dziękujemy! Zmiany są już aktywne.</p>;
  }
  return (
    <p className="warn-inline pay-note">
      Czekamy na potwierdzenie płatności od Przelewy24. Zwykle trwa to kilka sekund, strona odświeży się sama.
      <RefreshSoon />
    </p>
  );
}
