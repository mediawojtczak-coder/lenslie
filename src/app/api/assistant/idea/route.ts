import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2, BUCKET } from "@/lib/r2";
import { getUser } from "@/lib/supabase/server";
import { notifyAdmins } from "@/lib/email";

// „Masz pomysł na nową funkcję?” – pomysł fotografa trafia mailem do obsługi i zapisuje się w R2 (ideas/)
export async function POST(req: Request) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Zaloguj się." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { text?: string } | null;
  const text = String(body?.text ?? "").trim().slice(0, 3000);
  if (text.length < 5) return NextResponse.json({ error: "Opisz pomysł w kilku słowach." }, { status: 400 });
  const { data: profile } = await supabase.from("profiles").select("studio_name").eq("id", user.id).maybeSingle();
  const studio = (profile as { studio_name: string | null } | null)?.studio_name ?? "";
  const at = new Date().toISOString();
  await r2
    .send(new PutObjectCommand({ Bucket: BUCKET, Key: `ideas/${at.slice(0, 10)}/${user.id}-${Date.now()}.json`, Body: JSON.stringify({ at, uid: user.id, email: user.email, studio, text }), ContentType: "application/json" }))
    .catch(() => undefined);
  await notifyAdmins(`Lenslie: pomysł od fotografa (${user.email})`, "Nowy pomysł na funkcję", [`Fotograf: ${user.email}${studio ? ` (${studio})` : ""}`, `Pomysł: ${text}`]);
  return NextResponse.json({ ok: true });
}
