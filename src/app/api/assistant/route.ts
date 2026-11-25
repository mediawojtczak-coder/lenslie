import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { getMeta, isExpired } from "@/lib/galleries";
import { getWallet } from "@/lib/wallet";
import { listObjects } from "@/lib/photos";
import { putEmpty } from "@/lib/r2-light";
import { assistantAllowed, knowledge, SYSTEM_RULES, ASSISTANT_DAILY_LIMIT, ASSISTANT_MODEL } from "@/lib/assistant";

import { getLang } from "@/lib/lang-server";
import { stripeCurrency } from "@/lib/stripe";
import { foreignKnowledge } from "@/lib/assistant";

const langRule = (l: "pl" | "en") =>
  l === "en"
    ? "LANGUAGE: The visitor is using the ENGLISH version of Lenslie. Always reply in English, even if the knowledge above is in Polish. Translate feature names and button labels into English."
    : "JĘZYK: Fotograf korzysta z POLSKIEJ wersji Lenslie. Odpowiadaj zawsze po polsku.";

export const maxDuration = 60;

type Msg = { role: "user" | "assistant"; content: string };

// Asystent AI w panelu fotografa – odpowiada na pytania o Lenslie i o galerie zalogowanego fotografa
export async function POST(req: Request) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Zaloguj się." }, { status: 401 });
  if (!assistantAllowed(user.email)) return NextResponse.json({ error: "Asystent nie jest jeszcze dostępny na tym koncie." }, { status: 403 });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ error: "Asystent nie jest jeszcze skonfigurowany (brak klucza API)." }, { status: 503 });

  const body = (await req.json().catch(() => null)) as { messages?: Msg[] } | null;
  const messages = (body?.messages ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-16)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
  if (!messages.length || messages[messages.length - 1].role !== "user") return NextResponse.json({ error: "Brak pytania." }, { status: 400 });

  // dzienny limit pytań na konto (znaczniki w R2)
  const day = new Date().toISOString().slice(0, 10);
  const used = (await listObjects(`assistant/${day}/${user.id}/`).catch(() => [])).length;
  if (used >= ASSISTANT_DAILY_LIMIT)
    return NextResponse.json({ error: `Na dziś wykorzystano limit ${ASSISTANT_DAILY_LIMIT} pytań. Wróć jutro albo napisz do obsługi Lenslie.` }, { status: 429 });

  // dane konta fotografa (tylko jego własne)
  const [{ data: galleries }, { data: profile }, wallet] = await Promise.all([
    supabase.from("galleries").select("id, title, created_at").order("created_at", { ascending: false }).limit(25),
    supabase.from("profiles").select("studio_name").eq("id", user.id).maybeSingle(),
    getWallet(user.id).catch(() => ({ balance: 0, history: [] })),
  ]);
  const list = (galleries ?? []) as { id: string; title: string; created_at: string }[];
  const rows = await Promise.all(
    list.map(async (g) => {
      const [m, sel] = await Promise.all([
        getMeta(g.id).catch(() => null),
        supabase.from("selections").select("id", { count: "exact", head: true }).eq("gallery_id", g.id),
      ]);
      const state = !m?.plan ? "nieopublikowana (szkic)" : isExpired(m) ? "wygasła" : "opublikowana";
      const parts = [
        `„${g.title}” (id: ${g.id}, utworzona ${g.created_at.slice(0, 10)})`,
        state,
        m?.plan ? `pakiet: ${m.plan}` : "",
        m?.expiresAt ? `dostęp dla klienta do ${m.expiresAt.slice(0, 10)}` : "",
        m?.passwordHash || m?.password ? "chroniona hasłem" : "bez hasła",
        m?.clientEmail ? "e-mail klienta wpisany" : "",
        m?.sale?.enabled ? `sprzedaż zdjęć włączona (w pakiecie ${m.sale.included}, dodatkowe po ${m.sale.extraPrice} zł)` : "",
        m?.downloads ? `pobieranie: ${m.downloads}` : "",
        m?.watermark?.enabled ? "znak wodny włączony" : "",
        `wybory klientów: ${sel.count ?? 0}`,
      ].filter(Boolean);
      return `- ${parts.join("; ")}`;
    }),
  );
  const studio = (profile as { studio_name: string | null } | null)?.studio_name;
  const account = `DANE KONTA FOTOGRAFA (zalogowany: ${user.email}):
- nazwa studia: ${studio || "nie ustawiona"}
- saldo konta: ${(wallet.balance / 100).toFixed(2)} zł
- dzisiejsza data: ${day}
- galerie (najnowsze ${list.length}):
${rows.join("\n") || "- brak galerii"}`;

  const panelCur = await stripeCurrency(user.email).catch(() => null);
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: ASSISTANT_MODEL,
      max_tokens: 900,
      system: [
        { type: "text", text: `${SYSTEM_RULES}\n\nWIEDZA O LENSLIE:\n${knowledge()}`, cache_control: { type: "ephemeral" } },
        { type: "text", text: account },
        { type: "text", text: langRule(await getLang()) },
        ...(panelCur ? [{ type: "text", text: foreignKnowledge(panelCur) }] : []),
      ],
      messages,
    }),
  }).catch(() => null);
  if (!res?.ok) {
    console.error("assistant:", res?.status, await res?.text().catch(() => ""));
    return NextResponse.json({ error: "Asystent chwilowo nie odpowiada. Spróbuj za chwilę." }, { status: 502 });
  }
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = (data.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("").trim();
  await putEmpty(`assistant/${day}/${user.id}/${Date.now()}`).catch(() => undefined);
  return NextResponse.json({ text: text || "Nie udało mi się odpowiedzieć – spróbuj zadać pytanie inaczej." });
}
