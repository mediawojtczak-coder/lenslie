import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { adminClient, isAdminEmail } from "@/lib/supabase/admin";
import { addEntries } from "@/lib/wallet";

export const runtime = "nodejs";

// Gratis od Lenslie: dopisuje bonus do salda wybranego fotografa (np. darmowy pakiet)
export async function POST(req: Request) {
  const { user } = await getUser();
  if (!user || !isAdminEmail(user.email)) return NextResponse.json({ error: "Brak dostępu." }, { status: 403 });
  const form = await req.formData().catch(() => null);
  const email = String(form?.get("email") ?? "").trim().toLowerCase();
  const amount = Math.round(Number(form?.get("amount")) || 0);
  const note = String(form?.get("note") ?? "").trim().slice(0, 80) || "Gratis od Lenslie";
  const back = (q: string) => NextResponse.redirect(new URL(`/admin?gratis=${q}#gratis`, req.url), 303);
  if (!email || amount <= 0 || amount > 1000) return back("dane");

  const db = adminClient();
  if (!db) return back("baza");
  const { data } = await db.auth.admin.listUsers({ perPage: 1000 });
  const target = data?.users.find((u) => (u.email ?? "").toLowerCase() === email);
  if (!target) return back("brak");
  await addEntries(target.id, [{ type: "bonus", amount: amount * 100, description: note, ref: `gift-${Date.now()}` }]);
  return back("ok");
}
