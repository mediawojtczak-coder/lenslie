import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/supabase/admin";
import { getOrder, saveOrder } from "@/lib/p24";

export const runtime = "nodejs";

// Oznacza fakturę do płatności jako wystawioną (albo cofa oznaczenie)
export async function POST(req: Request) {
  const { user } = await getUser();
  if (!user || !isAdminEmail(user.email)) return NextResponse.json({ error: "Brak dostępu." }, { status: 403 });
  const form = await req.formData().catch(() => null);
  const order = await getOrder(String(form?.get("sid") ?? ""));
  if (order) await saveOrder({ ...order, invoiceIssued: form?.get("issued") === "1" });
  return NextResponse.redirect(new URL("/admin#platnosci", req.url), 303);
}
