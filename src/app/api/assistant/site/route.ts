import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHash } from "crypto";
import { listObjects } from "@/lib/photos";
import { putEmpty } from "@/lib/r2-light";
import { knowledge, SITE_RULES, ASSISTANT_MODEL, SITE_DAILY_PER_IP, SITE_DAILY_TOTAL, sitePublic } from "@/lib/assistant";

import { getLang } from "@/lib/lang-server";

const langRule = (l: "pl" | "en") =>
  l === "en"
    ? "LANGUAGE: The visitor is using the ENGLISH version of Lenslie. Always reply in English, even if the knowledge above is in Polish. Translate feature names and button labels into English."
    : "JĘZYK: Fotograf korzysta z POLSKIEJ wersji Lenslie. Odpowiadaj zawsze po polsku.";

export const maxDuration = 60;

type Msg = { role: "user" | "assistant"; content: string };

// Asystent na stronie Lenslie – dla odwiedzających (bez logowania), z dziennym limitem na adres i łącznie
export async function POST(req: Request) {
  const jar = await cookies();
  if (!sitePublic() && jar.get("lenslie_ai")?.value !== "1") return NextResponse.json({ error: "Asystent jest jeszcze w testach." }, { status: 403 });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ error: "Asystent nie jest jeszcze skonfigurowany." }, { status: 503 });
  // tylko z naszej strony (nie z cudzych skryptów)
  const origin = req.headers.get("origin") ?? "";
  if (origin && !/^https:\/\/(www\.)?lenslie\.com$|^http:\/\/localhost(:\d+)?$/.test(origin) && !origin.endsWith(".vercel.app"))
    return NextResponse.json({ error: "Brak dostępu." }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { messages?: Msg[] } | null;
  const messages = (body?.messages ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 1200) }));
  if (!messages.length || messages[messages.length - 1].role !== "user") return NextResponse.json({ error: "Brak pytania." }, { status: 400 });

  const day = new Date().toISOString().slice(0, 10);
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "anon";
  const who = createHash("sha256").update(`${day}:${ip}:${process.env.R2_SECRET_ACCESS_KEY ?? ""}`).digest("hex").slice(0, 16);
  const [mine, all] = await Promise.all([
    listObjects(`assistant-site/${day}/${who}/`).catch(() => []),
    listObjects(`assistant-site/${day}/`).catch(() => []),
  ]);
  if (mine.length >= SITE_DAILY_PER_IP || all.length >= SITE_DAILY_TOTAL)
    return NextResponse.json({ error: "Na dziś to już wszystkie pytania. Zajrzyj do /cennik albo kliknij „Porozmawiaj z człowiekiem”." }, { status: 429 });

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: ASSISTANT_MODEL,
      max_tokens: 700,
      system: [
        { type: "text", text: `${SITE_RULES}\n\nWIEDZA O LENSLIE:\n${knowledge()}\n\nDzisiejsza data: ${day}.`, cache_control: { type: "ephemeral" } },
        { type: "text", text: langRule(await getLang()) },
      ],
      messages,
    }),
  }).catch(() => null);
  if (!res?.ok) {
    console.error("assistant-site:", res?.status, await res?.text().catch(() => ""));
    return NextResponse.json({ error: "Asystent chwilowo nie odpowiada. Spróbuj za chwilę." }, { status: 502 });
  }
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = (data.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("").trim();
  await putEmpty(`assistant-site/${day}/${who}/${Date.now()}`).catch(() => undefined);
  return NextResponse.json({ text: text || "Nie udało mi się odpowiedzieć – spróbuj zadać pytanie inaczej." });
}
