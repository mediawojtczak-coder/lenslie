import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { notifyAdmins } from "@/lib/email";
import { sitePublic } from "@/lib/assistant";

// „Porozmawiaj z człowiekiem” na stronie – e-mail odwiedzającego (za zgodą) i rozmowa trafiają do Adama
export async function POST(req: Request) {
  const jar = await cookies();
  if (!sitePublic() && jar.get("lenslie_ai")?.value !== "1") return NextResponse.json({ error: "Brak dostępu." }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { messages?: { role: string; content: string }[]; email?: string } | null;
  const email = String(body?.email ?? "").trim().slice(0, 200);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Wpisz poprawny e-mail." }, { status: 400 });
  const msgs = (body?.messages ?? []).slice(-20);
  await notifyAdmins(`Lenslie: zapytanie ze strony (${email})`, "Ktoś prosi o kontakt przez asystenta", [
    `E-mail do odpowiedzi: ${email} (zgoda na kontakt zaznaczona)`,
    ...(msgs.length ? msgs.map((m) => `${m.role === "user" ? "Odwiedzający" : "Asystent"}: ${String(m.content).slice(0, 1500)}`) : ["(bez rozmowy)"]),
  ]);
  return NextResponse.json({ ok: true });
}
