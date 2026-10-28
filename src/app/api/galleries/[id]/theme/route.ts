import { NextResponse } from "next/server";
import { E } from "@/lib/api-lang";
import { getUser } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/owner";
import { getMeta, saveMeta } from "@/lib/galleries";
import { getTheme, isThemeId, ownsTheme } from "@/lib/themes";
import { purchase } from "@/lib/purchase";

export const runtime = "nodejs";

// Motyw galerii: wybór posiadanego albo zakup motywu premium (raz na konto)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const denied = await requireOwner(id);
  if (denied) return denied;
  const { user } = await getUser();
  const body = (await req.json().catch(() => null)) as { action?: string; theme?: string; pay?: string; invoice?: unknown } | null;
  const meta = await getMeta(id);
  if (!user || !body || !meta || !isThemeId(body.theme)) return NextResponse.json({ error: await E("Nieprawidłowe dane.") }, { status: 400 });
  const theme = getTheme(body.theme);

  if (body.action === "set") {
    if (!(await ownsTheme(user.id, theme.id))) return NextResponse.json({ error: await E("Najpierw kup ten motyw.") }, { status: 402 });
    meta.theme = theme.id;
    await saveMeta(id, meta);
    return NextResponse.json({ ok: true });
  }
  if (body.action === "buy") {
    if (await ownsTheme(user.id, theme.id)) {
      meta.theme = theme.id;
      await saveMeta(id, meta);
      return NextResponse.json({ ok: true });
    }
    return purchase({
      req,
      user,
      amount: theme.price,
      label: `motyw galerii ${theme.name}`,
      pay: body.pay,
      invoice: body.invoice,
      action: { action: "product", product: "theme", uid: user.id, theme: theme.id, galleryId: id },
      returnPath: `/panel/galeria/${id}?tab=ustawienia`,
      galleryId: id,
    });
  }
  return NextResponse.json({ error: await E("Nieznana operacja.") }, { status: 400 });
}
