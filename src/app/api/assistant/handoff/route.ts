import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { notifyAdmins } from "@/lib/email";
import { assistantAllowed } from "@/lib/assistant";

// „Wyślij rozmowę do Adama” – rozmowa z asystentem trafia mailem do administratorów
export async function POST(req: Request) {
  const { supabase, user } = await getUser();
  if (!user || !assistantAllowed(user.email)) return NextResponse.json({ error: "Brak dostępu." }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { messages?: { role: string; content: string }[]; note?: string } | null;
  const msgs = (body?.messages ?? []).slice(-20);
  const { data: profile } = await supabase.from("profiles").select("studio_name").eq("id", user.id).maybeSingle();
  const studio = (profile as { studio_name: string | null } | null)?.studio_name ?? "";
  const lines = [
    `Fotograf: ${user.email}${studio ? ` (${studio})` : ""}`,
    ...(body?.note ? [`Dopisek: ${String(body.note).slice(0, 1000)}`] : []),
    ...msgs.map((m) => `${m.role === "user" ? "Fotograf" : "Asystent"}: ${String(m.content).slice(0, 1500)}`),
  ];
  await notifyAdmins(`Lenslie: pytanie od fotografa (${user.email})`, "Rozmowa z asystentem do przejrzenia", lines);
  return NextResponse.json({ ok: true });
}
