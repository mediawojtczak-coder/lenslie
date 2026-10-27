import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/supabase/admin";
import { diagnoseReset } from "@/lib/auth-mail";

export const runtime = "nodejs";

// Diagnostyka maila resetu hasła – wynik pokazuje się w panelu administratora
export async function POST(req: Request) {
  const { user } = await getUser();
  if (!user || !isAdminEmail(user.email)) return NextResponse.json({ error: "Brak dostępu." }, { status: 403 });
  const result = await diagnoseReset(user.email!, new URL(req.url).origin).catch((e) => `Wyjątek: ${String(e)}`);
  const url = new URL("/admin", req.url);
  url.searchParams.set("reset", result.slice(0, 400));
  return NextResponse.redirect(url, 303);
}
