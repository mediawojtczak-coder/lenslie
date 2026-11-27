import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/supabase/admin";
import { addPushSub, removePushSub, pushAdmins, pushPublicKey, type PushSub } from "@/lib/admin-push";

export const runtime = "nodejs";

async function admin() {
  const { user } = await getUser();
  return Boolean(user && isAdminEmail(user.email));
}

export async function GET() {
  if (!(await admin())) return NextResponse.json({ error: "Brak dostępu." }, { status: 403 });
  return NextResponse.json({ publicKey: await pushPublicKey() });
}

export async function POST(req: Request) {
  if (!(await admin())) return NextResponse.json({ error: "Brak dostępu." }, { status: 403 });
  const b = (await req.json().catch(() => null)) as { action?: string; sub?: PushSub; endpoint?: string; label?: string } | null;
  if (b?.action === "subscribe" && b.sub?.endpoint?.startsWith("https://") && b.sub.keys?.p256dh && b.sub.keys?.auth) {
    await addPushSub({ endpoint: b.sub.endpoint, keys: { p256dh: b.sub.keys.p256dh, auth: b.sub.keys.auth }, label: (b.label ?? "").slice(0, 60) });
    return NextResponse.json({ ok: true });
  }
  if (b?.action === "unsubscribe" && b.endpoint) {
    await removePushSub(b.endpoint);
    return NextResponse.json({ ok: true });
  }
  if (b?.action === "test") {
    await pushAdmins("Lenslie: test powiadomień", "Działa! Tu będą nowi fotografowie i sprzedaż.", "/admin");
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Nieprawidłowe żądanie." }, { status: 400 });
}
