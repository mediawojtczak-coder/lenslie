import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidGalleryId } from "@/lib/r2";
import { getMeta, hasAccess, accessCookieName, isExpired } from "@/lib/galleries";
import { adminClient } from "@/lib/supabase/admin";
import { getSelection, selectionCookie } from "@/lib/selections";
import { getOwnerEmail } from "@/lib/profiles";
import { sendEmail, emailLayout, siteUrl } from "@/lib/email";

export const runtime = "nodejs";

type Body =
  | { action: "start"; name?: string; email?: string }
  | { action: "toggle"; photo?: string }
  | { action: "note"; note?: string; notify?: boolean };

// Ulubione zdjęcia klienta: rozpoczęcie wyboru, zaznaczanie i wysłanie fotografowi
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = adminClient();
  if (!db) return NextResponse.json({ error: "Ulubione nie są jeszcze włączone." }, { status: 503 });
  if (!isValidGalleryId(id)) return NextResponse.json({ error: "Nieprawidłowa galeria." }, { status: 400 });

  const meta = await getMeta(id);
  const store = await cookies();
  if (!meta || isExpired(meta) || !hasAccess(id, meta, store.get(accessCookieName(id))?.value)) {
    return NextResponse.json({ error: "Brak dostępu do galerii." }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body) return NextResponse.json({ error: "Nieprawidłowe dane." }, { status: 400 });

  if (body.action === "start") {
    const name = String(body.name ?? "").trim().slice(0, 80);
    const email = String(body.email ?? "").trim().slice(0, 120);
    if (!name) return NextResponse.json({ error: "Wpisz swoje imię." }, { status: 400 });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Sprawdź adres e-mail." }, { status: 400 });
    }
    const { data, error } = await db
      .from("selections")
      .insert({ gallery_id: id, client_name: name, client_email: email || null })
      .select("id")
      .single();
    if (error || !data) return NextResponse.json({ error: "Nie udało się zapisać wyboru." }, { status: 500 });
    const res = NextResponse.json({ ok: true, name, photos: [] });
    res.cookies.set(selectionCookie(id), data.id as string, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return res;
  }

  const sel = await getSelection(id, store.get(selectionCookie(id))?.value);
  if (!sel) return NextResponse.json({ error: "Wybór wygasł. Odśwież stronę.", code: "NO_SELECTION" }, { status: 404 });

  if (body.action === "toggle") {
    const photo = String(body.photo ?? "").slice(0, 200);
    if (!photo) return NextResponse.json({ error: "Nieprawidłowe zdjęcie." }, { status: 400 });
    const set = new Set(sel.photos ?? []);
    if (set.has(photo)) set.delete(photo);
    else if (set.size < 5000) set.add(photo);
    const photos = [...set];
    await db.from("selections").update({ photos, updated_at: new Date().toISOString() }).eq("id", sel.id);
    return NextResponse.json({ ok: true, photos });
  }

  if (body.action === "note") {
    const note = String(body.note ?? "").trim().slice(0, 2000) || null;
    await db.from("selections").update({ note, updated_at: new Date().toISOString() }).eq("id", sel.id);
    let notified = false;
    if (body.notify) {
      const to = await getOwnerEmail(id);
      if (to) {
        notified = await sendEmail({
          to,
          subject: `${sel.client_name} wybrał(a) ulubione zdjęcia – ${meta.title}`,
          html: emailLayout(
            "Nowy wybór zdjęć",
            [
              `${sel.client_name} zaznaczył(a) ${sel.photos.length} ulubionych zdjęć w galerii „${meta.title}”.`,
              ...(note ? [`Notatka: ${note}`] : []),
            ],
            { label: "Zobacz wybór w panelu", url: `${siteUrl()}/panel/galeria/${id}?tab=wybory` },
          ),
        });
      }
    }
    return NextResponse.json({ ok: true, notified });
  }

  return NextResponse.json({ error: "Nieznana operacja." }, { status: 400 });
}
