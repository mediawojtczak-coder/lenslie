import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/supabase/admin";
import { setFunnelStart } from "@/lib/funnel";

export const runtime = "nodejs";

// Lejek: „licz od nowa” – zapisuje moment startu (dane sprzed niego zostają, ale nie są liczone)
export async function POST(req: Request) {
  const { user } = await getUser();
  if (!user || !isAdminEmail(user.email)) return NextResponse.json({ error: "Brak dostępu." }, { status: 403 });
  const form = await req.formData().catch(() => null);
  await setFunnelStart(form?.get("clear") ? null : new Date().toISOString());
  return NextResponse.redirect(new URL("/admin#lejek", req.url), 303);
}
