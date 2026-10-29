import { getPrintOrder, savePrintOrder, zipDownloadUrl } from "@/lib/print";
import { sendEmail, emailLayout, siteUrl } from "@/lib/email";

const zl = (n: number) => `${n.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł`;

// Zamówienie albumu opłacone: zapis i maile do administratora (z plikami) oraz do fotografa
export async function printPaid(orderId: string) {
  const o = await getPrintOrder(orderId);
  if (!o || o.status !== "draft") return;
  o.status = "paid";
  o.paidAt = new Date().toISOString();
  await savePrintOrder(o);

  const files = await zipDownloadUrl(o.id).catch(() => "");
  const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  const lines = [
    `Album ${o.format} cm, ${o.pages} stron (${o.spreads} rozkładówek w projekcie)${o.copies > 1 ? `, ${o.copies} egz.` : ""} – „${o.title}”.`,
    `Zapłacono: ${zl(o.price)} (z wysyłką). Konto: ${o.email}.`,
    `Wysyłka InPost do paczkomatu ${o.shipping.locker}: ${o.shipping.name}, tel. ${o.shipping.phone}, ${o.shipping.email}.`,
    o.spreads * 2 < o.pages ? `Projekt ma ${o.spreads * 2} stron – dopełnij do ${o.pages} pustymi stronami.` : "",
    "Pliki (ZIP z rozkładówkami 300 dpi) – link ważny 7 dni, potem pobierzesz je w panelu administratora.",
  ].filter(Boolean);
  for (const to of admins) {
    await sendEmail({
      to,
      subject: `Zamówienie albumu ${o.format}: ${zl(o.price)} – ${o.email}`,
      html: emailLayout("Nowe zamówienie wydruku albumu", lines, files ? { label: "Pobierz pliki albumu", url: files } : { label: "Panel administratora", url: `${siteUrl()}/admin#albumy` }),
    }).catch(() => undefined);
  }
  await sendEmail({
    to: o.email,
    subject: `Zamówienie albumu „${o.title}” przyjęte`,
    html: emailLayout(
      "Dziękujemy za zamówienie albumu",
      [
        `Album ${o.format} cm, ${o.pages} stron${o.copies > 1 ? `, ${o.copies} egz.` : ""} – „${o.title}”.`,
        `Zapłacono ${zl(o.price)}. Album wyślemy InPostem do paczkomatu ${o.shipping.locker} (odbiorca: ${o.shipping.name}).`,
        "Czas realizacji: do 12 dni roboczych. Numer przesyłki prześlemy mailem.",
      ],
      { label: "Otwórz projekt", url: `${siteUrl()}/panel/galeria/${o.galleryId}?tab=album` },
    ),
  }).catch(() => undefined);
}
