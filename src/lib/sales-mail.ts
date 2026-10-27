import { sendEmail, emailLayout, siteUrl } from "@/lib/email";
import { getOwnerContact } from "@/lib/profiles";
import { money } from "@/lib/lang";
import type { Payout, SaleOrder } from "@/lib/sales";

type L = "pl" | "en";
export const cash = (n: number, lang: L) => money(n, lang, n % 1 !== 0);

// Instrukcja płatności – w mailu do klienta i w galerii
export function paymentLines(o: SaleOrder, payout: Payout | null, title: string, lang: L): string[] {
  if (o.total <= 0) return [];
  const en = lang === "en";
  const lines = [en ? `Amount: ${cash(o.total, lang)}` : `Kwota: ${cash(o.total, lang)}`];
  if (payout?.account) {
    lines.push(
      en ? `Bank transfer to: ${payout.holder}, account ${payout.account}` : `Przelew na konto: ${payout.holder}, ${payout.account}`,
      en ? `Transfer title: ${transferTitle(o, title)}` : `Tytuł przelewu: ${transferTitle(o, title)}`,
    );
  }
  if (payout?.blik) lines.push(en ? `BLIK to phone number: ${payout.blik}` : `BLIK na numer telefonu: ${payout.blik}`);
  if (!payout) lines.push(en ? "Your photographer will send you the payment details." : "Fotograf prześle Ci dane do wpłaty.");
  return lines;
}

export const transferTitle = (o: SaleOrder, title: string) => `${title.slice(0, 60)} ${o.ref}`;

export async function mailOrderPlaced(galleryId: string, title: string, o: SaleOrder, payout: Payout | null, galleryLang: L) {
  // Do fotografa – w jego języku
  const owner = await getOwnerContact(galleryId).catch(() => null);
  if (owner) {
    const en = owner.lang === "en";
    const summary = en
      ? `${o.clientName} ordered ${o.photos.length} photos from “${title}”: ${o.included} included in the package, ${o.extra} extra.`
      : `${o.clientName} zamówił(a) ${o.photos.length} zdjęć z galerii „${title}”: ${Math.min(o.photos.length, o.included)} w pakiecie, ${o.extra} dodatkowych.`;
    await sendEmail({
      to: owner.email,
      subject: en
        ? `New order: ${o.clientName} – ${o.total > 0 ? cash(o.total, "en") : "no extra payment"}`
        : `Nowe zamówienie: ${o.clientName} – ${o.total > 0 ? cash(o.total, "pl") : "bez dopłaty"}`,
      html: emailLayout(
        en ? "New photo order" : "Nowe zamówienie zdjęć",
        [
          summary,
          o.total > 0
            ? en
              ? `To pay: ${cash(o.total, "en")} (order ${o.ref}). When the money arrives, mark the order as paid and share the photos.`
              : `Do zapłaty: ${cash(o.total, "pl")} (zamówienie ${o.ref}). Gdy pieniądze dotrą, oznacz zamówienie jako opłacone i udostępnij zdjęcia.`
            : en
              ? "No extra payment is needed – you can share the photos right away."
              : "Bez dopłaty – możesz od razu udostępnić zdjęcia.",
          ...(o.note ? [`${en ? "Message" : "Wiadomość"}: ${o.note}`] : []),
        ],
        { label: en ? "See the order" : "Zobacz zamówienie", url: `${siteUrl()}/panel/galeria/${galleryId}?tab=wybory` },
        owner.lang,
      ),
    }).catch(() => undefined);
  }

  // Do klienta – w języku galerii
  if (o.clientEmail) {
    const en = galleryLang === "en";
    await sendEmail({
      to: o.clientEmail,
      subject: en ? `Your order – ${title}` : `Twoje zamówienie – ${title}`,
      html: emailLayout(
        en ? "Thank you for your order" : "Dziękujemy za zamówienie",
        [
          en ? `You chose ${o.photos.length} photos from “${title}”.` : `Wybrane zdjęcia z galerii „${title}”: ${o.photos.length}.`,
          ...(o.total > 0
            ? [
                en ? "Please pay for the extra photos:" : "Prosimy o dopłatę za dodatkowe zdjęcia:",
                ...paymentLines(o, payout, title, galleryLang),
                en
                  ? "Once your photographer confirms the payment, you will be able to download your photos without the watermark."
                  : "Gdy fotograf potwierdzi wpłatę, pobierzesz swoje zdjęcia bez znaku wodnego.",
              ]
            : [
                en
                  ? "Your photographer will prepare the photos – we will email you when they are ready to download."
                  : "Fotograf przygotuje zdjęcia – napiszemy do Ciebie, gdy będą gotowe do pobrania.",
              ]),
        ],
        { label: en ? "Open the gallery" : "Otwórz galerię", url: `${siteUrl()}/galeria/${galleryId}` },
        galleryLang,
      ),
    }).catch(() => undefined);
  }
}

export async function mailDelivered(galleryId: string, title: string, o: SaleOrder, galleryLang: L) {
  if (!o.clientEmail) return;
  const en = galleryLang === "en";
  await sendEmail({
    to: o.clientEmail,
    subject: en ? `Your photos are ready – ${title}` : `Twoje zdjęcia są gotowe – ${title}`,
    html: emailLayout(
      en ? "Your photos are ready" : "Twoje zdjęcia są gotowe",
      [
        en
          ? `Your ${o.photos.length} photos from “${title}” are ready. Open the gallery to download them in full resolution, without the watermark.`
          : `Twoje zdjęcia z galerii „${title}” (${o.photos.length}) są gotowe. Otwórz galerię, aby pobrać je w pełnej rozdzielczości, bez znaku wodnego.`,
      ],
      { label: en ? "Download my photos" : "Pobierz moje zdjęcia", url: `${siteUrl()}/galeria/${galleryId}` },
      galleryLang,
    ),
  }).catch(() => undefined);
}
