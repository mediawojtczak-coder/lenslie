import { getUserLang } from "@/lib/lang-server";
import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/supabase/admin";
import { getPrintOrder, savePrintOrder } from "@/lib/print";
import { sendEmail, emailLayout } from "@/lib/email";

export const runtime = "nodejs";

// Administrator: status zamówienia wydruku albumu (zamówione w drukarni / wysłane z numerem przesyłki)
export async function POST(req: Request) {
  const { user } = await getUser();
  if (!user || !isAdminEmail(user.email)) return NextResponse.json({ error: "Brak dostępu." }, { status: 403 });
  const form = await req.formData().catch(() => null);
  const o = await getPrintOrder(String(form?.get("id") ?? ""));
  const status = String(form?.get("status") ?? "");
  if (o && o.status !== "draft" && (status === "ordered" || status === "sent" || status === "paid")) {
    const tracking = String(form?.get("tracking") ?? "").trim().slice(0, 40);
    const wasSent = o.status === "sent";
    o.status = status;
    if (tracking) o.tracking = tracking;
    await savePrintOrder(o);
    if (status === "sent" && !wasSent) {
      const track = o.tracking ? `https://inpost.pl/sledzenie-przesylek?number=${encodeURIComponent(o.tracking)}` : "";
      const en = (await getUserLang(o.uid).catch(() => "pl")) === "en";
      await sendEmail({
        to: o.email,
        subject: en ? `Your album “${o.title}” is on its way` : `Album „${o.title}” jest w drodze`,
        html: en
          ? emailLayout(
              "Your album is on its way",
              [
                `The album “${o.title}” (${o.format} cm, ${o.pages} pages) has been shipped by InPost to the parcel locker ${o.shipping.locker}.`,
                o.tracking
                  ? `Tracking number: ${o.tracking}. The pickup code will arrive by text message at ${o.shipping.phone}.`
                  : `The pickup code will arrive by text message at ${o.shipping.phone}.`,
              ],
              track ? { label: "Track the parcel", url: track } : undefined,
              "en",
            )
          : emailLayout(
              "Twój album jest w drodze",
              [
                `Album „${o.title}” (${o.format} cm, ${o.pages} stron) został wysłany InPostem do paczkomatu ${o.shipping.locker}.`,
                o.tracking ? `Numer przesyłki: ${o.tracking}. Kod odbioru przyjdzie SMS-em na numer ${o.shipping.phone}.` : `Kod odbioru przyjdzie SMS-em na numer ${o.shipping.phone}.`,
              ],
              track ? { label: "Śledź przesyłkę", url: track } : undefined,
            ),
      }).catch(() => undefined);
    }
  }
  return NextResponse.redirect(new URL("/admin#albumy", req.url), 303);
}
