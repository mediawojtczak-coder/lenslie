import { NextResponse } from "next/server";
import { E } from "@/lib/api-lang";
import { getUser } from "@/lib/supabase/server";
import { revokeAll } from "@/lib/lr";

export const runtime = "nodejs";

// Panel: wyloguj wtyczkę Lightroom na wszystkich komputerach
export async function POST() {
  const { user } = await getUser();
  if (!user) return NextResponse.json({ error: await E("Zaloguj się ponownie.") }, { status: 401 });
  await revokeAll(user.id);
  return NextResponse.json({ ok: true });
}
