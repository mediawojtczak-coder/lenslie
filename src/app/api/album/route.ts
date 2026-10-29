import { NextResponse } from "next/server";
import { E } from "@/lib/api-lang";
import { getUser } from "@/lib/supabase/server";
import { purchase } from "@/lib/purchase";
import { ALBUM_PRICES } from "@/lib/albums";

export const runtime = "nodejs";

// Zakup abonamentu Projektora albumów (miesiąc albo rok)
export async function POST(req: Request) {
  const { user } = await getUser();
  if (!user) return NextResponse.json({ error: await E("Zaloguj się ponownie.") }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { months?: number; pay?: string; invoice?: unknown; returnPath?: string } | null;
  const months = Number(body?.months) === 12 ? 12 : 1;
  const back = typeof body?.returnPath === "string" && /^\/panel\/[a-z0-9/_-]*$/i.test(body.returnPath) ? body.returnPath : "/panel/albumy";
  return purchase({
    req,
    user,
    amount: ALBUM_PRICES[months],
    label: `projektor albumów, ${months === 12 ? "12 mies." : "1 mies."}`,
    pay: body?.pay,
    invoice: body?.invoice,
    action: { action: "product", product: "album", uid: user.id, months },
    returnPath: back,
  });
}
