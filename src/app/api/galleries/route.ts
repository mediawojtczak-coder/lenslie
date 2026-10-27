import { NextResponse } from "next/server";
import { isValidGalleryId } from "@/lib/r2";
import { getMeta, saveMeta, hashPassword, type GalleryMeta } from "@/lib/galleries";
import { getUser } from "@/lib/supabase/server";
import { getPlan, isPeriod, addMonths } from "@/lib/plans";

export const runtime = "nodejs";

// Tworzy lub aktualizuje galerię zalogowanego fotografa
export async function POST(req: Request) {
  const { supabase, user } = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Zaloguj się ponownie." }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | {
        gallery?: string;
        title?: string;
        clientPassword?: string;
        layout?: string;
        removePassword?: boolean;
        plan?: string;
        period?: number;
        eventDate?: string;
        welcome?: string;
      }
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

  const requestedTitle = String(body?.title ?? "").trim().slice(0, 120);

  // Galeria należy do fotografa? (dzięki zasadom bezpieczeństwa widzi tylko swoje)
  const { data: own } = await supabase.from("galleries").select("id, title").eq("id", id).maybeSingle();
  const title = requestedTitle || (own as { title?: string } | null)?.title || id;

  if (own) {
    if (requestedTitle) await supabase.from("galleries").update({ title }).eq("id", id);
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

  const rawLayout = body?.layout;
  const requestedLayout: GalleryMeta["layout"] =
    rawLayout === "siatka" || rawLayout === "mozaika" ? rawLayout : undefined;

  const existing = await getMeta(id);
  const meta: GalleryMeta = {
    ...(existing ?? {}),
    title,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    passwordHash: body?.removePassword
      ? undefined
      : clientPassword
        ? hashPassword(clientPassword)
        : existing?.passwordHash,
    password: body?.removePassword ? undefined : clientPassword || existing?.password,
    layout: requestedLayout ?? existing?.layout ?? "mozaika",
    plan: existing?.plan,
    period: existing?.period,
    expiresAt: existing?.expiresAt,
    cover: existing?.cover,
  };

  if (typeof body?.eventDate === "string") {
    const d = body.eventDate.trim();
    meta.eventDate = /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : undefined;
  }
  if (typeof body?.welcome === "string") {
    meta.welcome = body.welcome.trim().slice(0, 1500) || undefined;
  }

  // Pakiet wybiera się raz, przy tworzeniu galerii. Późniejsze zmiany tylko przez /api/galleries/[id]/plan
  if (!meta.plan) {
    const plan = getPlan(body?.plan);
    const period = body?.period;
    if (plan && isPeriod(period)) {
      meta.plan = plan.id;
      meta.period = period;
      meta.expiresAt = addMonths(new Date(), period).toISOString();
    }
  }
  await saveMeta(id, meta);

  return NextResponse.json({ ok: true, id, protected: Boolean(meta.passwordHash) });
}
