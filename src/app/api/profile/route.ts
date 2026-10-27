import { NextResponse } from "next/server";
import { E } from "@/lib/api-lang";
import { randomBytes } from "crypto";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, BUCKET } from "@/lib/r2";
import { getUser } from "@/lib/supabase/server";
import { cleanBilling, saveBilling } from "@/lib/billing";

export const runtime = "nodejs";

const LOGO_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

type Body =
  | { action: "save"; studioName?: string }
  | { action: "logo-url"; type?: string; size?: number }
  | { action: "logo-done"; key?: string }
  | { action: "logo-remove" }
  | { action: "password"; password?: string }
  | { action: "billing"; billing?: unknown };

const NO_TABLE = "Nie udało się zapisać profilu. Sprawdź, czy w Supabase uruchomiono SQL z tabelą profiles.";

// Konto fotografa: nazwa studia, logo i hasło
export async function POST(req: Request) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: await E("Zaloguj się ponownie.") }, { status: 401 });
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body) return NextResponse.json({ error: await E("Nieprawidłowe dane.") }, { status: 400 });

  if (body.action === "billing") {
    const c = cleanBilling({ ...(body.billing as object), want: true });
    if (!c.ok) return NextResponse.json({ error: await E(c.error) }, { status: 400 });
    await saveBilling(user.id, c.billing);
    return NextResponse.json({ ok: true });
  }

  const current = await supabase.from("profiles").select("logo_key").eq("id", user.id).maybeSingle();
  const upsert = (fields: Record<string, unknown>) =>
    supabase.from("profiles").upsert({ id: user.id, email: user.email, ...fields }, { onConflict: "id" });

  switch (body.action) {
    case "save": {
      const studioName = String(body.studioName ?? "").trim().slice(0, 80) || null;
      const { error } = await upsert({ studio_name: studioName });
      if (error) return NextResponse.json({ error: await E(NO_TABLE) }, { status: 500 });
      return NextResponse.json({ ok: true });
    }
    case "logo-url": {
      const ext = LOGO_TYPES[String(body.type)];
      if (!ext) return NextResponse.json({ error: await E("Logo musi być plikiem PNG, JPG lub WebP.") }, { status: 400 });
      if (!body.size || body.size > 2 * 1024 * 1024) {
        return NextResponse.json({ error: await E("Logo może mieć najwyżej 2 MB.") }, { status: 400 });
      }
      const key = `profiles/${user.id}/logo-${randomBytes(4).toString("hex")}.${ext}`;
      const url = await getSignedUrl(r2, new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: String(body.type) }), {
        expiresIn: 600,
      });
      return NextResponse.json({ url, key });
    }
    case "logo-done": {
      const key = String(body.key ?? "");
      if (!key.startsWith(`profiles/${user.id}/logo-`)) {
        return NextResponse.json({ error: await E("Nieprawidłowy plik.") }, { status: 400 });
      }
      const old = current.data?.logo_key as string | undefined;
      const { error } = await upsert({ logo_key: key });
      if (error) return NextResponse.json({ error: await E(NO_TABLE) }, { status: 500 });
      if (old && old !== key) await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: old })).catch(() => undefined);
      return NextResponse.json({ ok: true });
    }
    case "logo-remove": {
      const old = current.data?.logo_key as string | undefined;
      const { error } = await upsert({ logo_key: null });
      if (error) return NextResponse.json({ error: await E(NO_TABLE) }, { status: 500 });
      if (old) await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: old })).catch(() => undefined);
      return NextResponse.json({ ok: true });
    }
    case "password": {
      const password = String(body.password ?? "");
      if (password.length < 8) return NextResponse.json({ error: await E("Hasło musi mieć co najmniej 8 znaków.") }, { status: 400 });
      const { error } = await supabase.auth.updateUser({ password });
      if (error) return NextResponse.json({ error: await E("Nie udało się zmienić hasła. Zaloguj się ponownie i spróbuj jeszcze raz.") }, { status: 400 });
      return NextResponse.json({ ok: true });
    }
    default:
      return NextResponse.json({ error: await E("Nieznana operacja.") }, { status: 400 });
  }
}
