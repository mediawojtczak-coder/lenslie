import { NextResponse } from "next/server";
import { isValidGalleryId } from "@/lib/r2";
import { getMeta, saveMeta, hashPassword, type GalleryMeta } from "@/lib/galleries";
import { getUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Tworzy lub aktualizuje galerię zalogowanego fotografa
export async function POST(req: Request) {
  const { supabase, user } = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Zaloguj się ponownie." }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | { gallery?: string; title?: string; clientPassword?: string }
    | null;

  const id = String(body?.gallery ?? "");
  if (!isValidGalleryId(id)) {
    return NextResponse.json(
      { error: "Adres galerii może zawierać tylko małe litery, cyfry i myślniki." },
      { status: 400 },
    );
  }

  const clientPassword = String(body?.clientPassword ?? "").trim();
  if (clientPassword && clientPassword.length < 4) {
    return NextResponse.json(
      { error: "Hasło dla klienta musi mieć co najmniej 4 znaki." },
      { status: 400 },
    );
  }

  const title = String(body?.title ?? "").trim().slice(0, 120) || id;

  // Galeria należy do fotografa? (dzięki zasadom bezpieczeństwa widzi tylko swoje)
  const { data: own } = await supabase.from("galleries").select("id").eq("id", id).maybeSingle();

  if (own) {
    await supabase.from("galleries").update({ title }).eq("id", id);
  } else {
    const { error } = await supabase.from("galleries").insert({ id, title, owner_id: user.id });
    if (error) {
      const taken = error.code === "23505";
      return NextResponse.json(
        {
          error: taken
            ? "Ten adres galerii jest już zajęty. Zmień nazwę galerii."
            : "Nie udało się zapisać galerii.",
        },
        { status: taken ? 409 : 500 },
      );
    }
  }

  const existing = await getMeta(id);
  const meta: GalleryMeta = {
    title,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    passwordHash: clientPassword ? hashPassword(clientPassword) : existing?.passwordHash,
  };
  await saveMeta(id, meta);

  return NextResponse.json({ ok: true, protected: Boolean(meta.passwordHash) });
}
