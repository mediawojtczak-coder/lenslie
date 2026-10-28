import { randomInt } from "crypto";
import { lrUser, lrError, ownsGallery } from "@/lib/lr";
import { adminClient } from "@/lib/supabase/admin";
import { getMeta, saveMeta, hashPassword, isExpired } from "@/lib/galleries";
import { getUserLang } from "@/lib/lang-server";
import { siteUrl } from "@/lib/email";

export const runtime = "nodejs";

const toSlug = (text: string) =>
  text
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);

// Hasło łatwe do przepisania z SMS-a (jak przy tworzeniu galerii w panelu)
function clientPassword() {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 8 }, () => chars[randomInt(chars.length)]).join("");
}

// Lista galerii fotografa (do wyboru we wtyczce)
export async function GET(req: Request) {
  const user = await lrUser(req);
  if (!user) return lrError("pl", "Zaloguj się ponownie we wtyczce.", "Sign in again in the plugin.", 401);
  const db = adminClient()!;
  const { data } = await db.from("galleries").select("id, title, created_at").eq("owner_id", user.uid).order("created_at", { ascending: false });
  const list = await Promise.all(
    (data ?? []).map(async (g) => {
      const meta = await getMeta(g.id).catch(() => null);
      return { id: g.id, title: g.title, published: Boolean(meta?.plan), expired: isExpired(meta), url: `${siteUrl()}/panel/galeria/${g.id}` };
    }),
  );
  return Response.json({ galleries: list });
}

// Nowa galeria z kolekcji Lightrooma (wersja robocza – fotograf publikuje ją w panelu)
export async function POST(req: Request) {
  const user = await lrUser(req);
  if (!user) return lrError("pl", "Zaloguj się ponownie we wtyczce.", "Sign in again in the plugin.", 401);
  const body = (await req.json().catch(() => null)) as { title?: string } | null;
  const title = String(body?.title ?? "").trim().slice(0, 120);
  if (!title) return lrError(user.lang, "Podaj nazwę galerii.", "Enter a gallery name.");
  const db = adminClient()!;

  const base = toSlug(title) || "galeria";
  let id = "";
  for (let i = 0; i < 6 && !id; i++) {
    const candidate = i === 0 ? base : `${base}-${randomInt(1000, 9999)}`;
    const { error } = await db.from("galleries").insert({ id: candidate, title, owner_id: user.uid });
    if (!error) id = candidate;
    else if (error.code !== "23505") return lrError(user.lang, "Nie udało się utworzyć galerii.", "Could not create the gallery.", 500);
  }
  if (!id) return lrError(user.lang, "Nie udało się utworzyć galerii – zmień nazwę kolekcji.", "Could not create the gallery – rename the collection.", 409);

  const password = clientPassword();
  await saveMeta(id, {
    title,
    createdAt: new Date().toISOString(),
    passwordHash: hashPassword(password),
    password,
    layout: "mozaika",
    lang: await getUserLang(user.uid).catch(() => "pl" as const),
  });
  return Response.json({ id, title, url: `${siteUrl()}/panel/galeria/${id}` });
}
