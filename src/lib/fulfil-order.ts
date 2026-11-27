import { pushAdmins } from "@/lib/admin-push";
import { getOrder, saveOrder, type Order } from "@/lib/p24";
import { applyAction } from "@/lib/plan-actions";
import { activateGuestEvent } from "@/lib/guest-events";
import { getMeta, saveMeta } from "@/lib/galleries";
import { startVideos } from "@/lib/videos";
import { fulfillProduct } from "@/lib/products";
import { addEntries } from "@/lib/wallet";
import { referralPayment } from "@/lib/referrals";
import { sendEmail, emailLayout, siteUrl } from "@/lib/email";
import { getOwnerContact } from "@/lib/profiles";
import { claimOnce } from "@/lib/r2-light";
import { fmtCur } from "@/lib/foreign-prices";

// Wykonanie opłaconego zamówienia – wspólne dla Przelewy24 i Stripe.
// Zabezpieczone przed podwójnym wykonaniem (np. powiadomienie i powrót klienta w tej samej chwili).
export async function fulfilOrder(sid: string, via: { gateway: "p24" | "stripe"; ref: string; orderId?: number }) {
  const fresh = await getOrder(sid);
  if (!fresh || fresh.status === "paid") return fresh;
  if (!(await claimOnce(`payments-done/${sid}`))) return fresh;
  const order: Order = fresh;
  try {
    await runAction(order);
  } catch (e) {
    // Nie udało się – zdejmujemy blokadę, żeby kolejne powiadomienie mogło spróbować ponownie
    const { r2, BUCKET } = await import("@/lib/r2");
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: `payments-done/${sid}` })).catch(() => undefined);
    throw e;
  }
  await saveOrder({ ...order, status: "paid", paidAt: new Date().toISOString(), ...(via.orderId ? { orderId: via.orderId } : {}) });
  await afterPaid(order, via);
  return getOrder(sid);
}

async function runAction(order: Order) {
  if (order.action.action === "topup" && order.action.cur) {
    const a = order.action;
    const cur = order.action.cur;
    await addEntries(
      order.ownerId,
      [
        { type: "topup", amount: a.amount * 100, description: `Balance top-up (card)`, ref: order.sessionId },
        ...(a.bonus ? [{ type: "bonus" as const, amount: a.bonus * 100, description: `Top-up bonus`, ref: order.sessionId }] : []),
      ],
      cur,
    );
  } else if (order.action.action === "topup") {
    const a = order.action;
    await addEntries(order.ownerId, [
      { type: "topup", amount: a.amount * 100, description: `Doładowanie konta (Przelewy24)`, ref: order.sessionId },
      ...(a.bonus ? [{ type: "bonus" as const, amount: a.bonus * 100, description: `Bonus do doładowania ${a.amount} zł`, ref: order.sessionId }] : []),
    ]);
  } else if (order.action.action === "product") {
    await fulfillProduct(order.action);
  } else if (order.action.action === "videos") {
    const meta = await getMeta(order.action.galleryId);
    if (meta?.videos) {
      await startVideos(meta.videos, order.action.ids);
      await saveMeta(order.action.galleryId, meta);
    }
  } else if (order.action.action === "guest-event") {
    await activateGuestEvent(order.action.eventId);
  } else {
    await applyAction(order.galleryId, order.action);
  }
}

async function afterPaid(order: Order, via: { gateway: "p24" | "stripe"; ref: string; orderId?: number }) {
  // Klient sam przedłużył galerię – dajemy znać fotografowi
  if (order.byClient && order.action.action === "extend") {
    const owner = await getOwnerContact(order.galleryId).catch(() => null);
    const meta = await getMeta(order.galleryId).catch(() => null);
    if (owner && meta?.expiresAt) {
      const en = owner.lang === "en";
      const until = new Intl.DateTimeFormat(en ? "en-GB" : "pl-PL", { day: "numeric", month: "long", year: "numeric" }).format(new Date(meta.expiresAt));
      await sendEmail({
        to: owner.email,
        subject: en ? `Your client extended “${meta.title}”` : `Klient przedłużył galerię „${meta.title}”`,
        html: emailLayout(
          en ? "Gallery extended by your client" : "Klient przedłużył galerię",
          en
            ? [`Your client (${order.email}) paid to extend “${meta.title}” by ${order.action.period} months.`, `The gallery is now available until ${until}.`]
            : [`Klient (${order.email}) opłacił przedłużenie galerii „${meta.title}” o ${order.action.period} mies.`, `Galeria jest teraz dostępna do ${until}.`],
          { label: en ? "Open the gallery" : "Otwórz galerię", url: `${siteUrl()}/panel/galeria/${order.galleryId}` },
          owner.lang,
        ),
      }).catch(() => undefined);
    }
  }
  await referralPayment(order.ownerId, order.amount).catch((e) => console.error("Polecenia:", e));

  // Mail do administratora: nowa płatność (z danymi do faktury, jeśli klient jej chce)
  const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  const zl = (order.amount / 100).toLocaleString("pl-PL", { minimumFractionDigits: 2 }) + " zł";
  const kwota = order.foreign ? `${fmtCur(order.foreign.amount, order.foreign.cur)} (ok. ${zl})` : zl;
  const bramka = via.gateway === "stripe" ? `Stripe, ${via.ref}` : `Przelewy24, nr ${via.orderId ?? via.ref}`;
  const inv = order.invoice;
  const gal = ["choose", "upgrade", "extend"].includes(order.action.action);
  const galKind = order.action.action === "choose" ? "Nowa galeria" : order.action.action === "upgrade" ? "Większy pakiet galerii" : order.byClient ? "Klient przedłużył galerię" : "Przedłużenie galerii";
  const topup = order.action.action === "topup";
  await pushAdmins(gal ? `🖼️ ${galKind}: ${kwota}` : topup ? `💰 Doładowanie salda: ${kwota}` : `💳 Nowa płatność: ${kwota}`, `${order.description} – ${order.email}${inv ? " (prosi o fakturę)" : ""}`, "/admin#platnosci");
  for (const to of admins) {
    await sendEmail({
      to,
      subject: inv ? `Wystaw fakturę: ${kwota} – ${inv.company}` : `Nowa płatność Lenslie: ${kwota}`,
      html: emailLayout(
        inv ? "Nowa płatność – klient prosi o fakturę" : "Nowa płatność",
        [
          `Kwota: ${kwota} (${bramka}).`,
          `Za: ${order.description}.`,
          `Konto: ${order.email}.`,
          ...(inv
            ? [`Faktura na: ${inv.company}, ${inv.country ? (inv.nip ? `VAT ${inv.nip}` : "osoba prywatna / bez numeru VAT") : `NIP ${inv.nip}`}, ${inv.street}, ${inv.postcode} ${inv.city}${inv.country ? `, ${inv.country}` : ""}.`, "Fakturę wyślij na adres e-mail konta."]
            : ["Klient nie prosił o fakturę."]),
        ],
        { label: "Płatności w panelu administratora", url: `${siteUrl()}/admin#platnosci` },
      ),
    }).catch(() => undefined);
  }
}
