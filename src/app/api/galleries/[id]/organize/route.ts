import { NextResponse } from "next/server";
import { E } from "@/lib/api-lang";
import { randomBytes } from "crypto";
import { getMeta, saveMeta, type Section } from "@/lib/galleries";
import { requireOwner } from "@/lib/owner";

export const runtime = "nodejs";

type Body =
  | { action: "order"; order: string[] }
  | { action: "add-section"; name: string }
  | { action: "rename-section"; section: string; name: string }
  | { action: "delete-section"; section: string }
  | { action: "move-section"; section: string; dir: number }
  | { action: "assign"; names: string[]; section: string | null };

const cleanName = (v: unknown) => String(v ?? "").trim().slice(0, 60);

// Porządkowanie galerii: kolejność zdjęć i sekcje
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const denied = await requireOwner(id);
  if (denied) return denied;

  const body = (await req.json().catch(() => null)) as Body | null;
  const meta = await getMeta(id);
  if (!body || !meta) return NextResponse.json({ error: await E("Nieprawidłowe dane.") }, { status: 400 });

  const sections: Section[] = meta.sections ?? [];
  const map: Record<string, string> = { ...(meta.photoSection ?? {}) };

  switch (body.action) {
    case "order": {
      if (!Array.isArray(body.order)) return NextResponse.json({ error: await E("Nieprawidłowe dane.") }, { status: 400 });
      meta.order = body.order.map(String).slice(0, 10000);
      break;
    }
    case "add-section": {
      const name = cleanName(body.name);
      if (!name) return NextResponse.json({ error: await E("Wpisz nazwę sekcji.") }, { status: 400 });
      if (sections.length >= 30) return NextResponse.json({ error: await E("Galeria może mieć najwyżej 30 sekcji.") }, { status: 400 });
      const section = { id: randomBytes(4).toString("hex"), name };
      meta.sections = [...sections, section];
      await saveMeta(id, meta);
      return NextResponse.json({ ok: true, section });
    }
    case "rename-section": {
      const name = cleanName(body.name);
      const s = sections.find((x) => x.id === body.section);
      if (!s || !name) return NextResponse.json({ error: await E("Wpisz nazwę sekcji.") }, { status: 400 });
      s.name = name;
      meta.sections = sections;
      break;
    }
    case "delete-section": {
      meta.sections = sections.filter((x) => x.id !== body.section);
      for (const k of Object.keys(map)) if (map[k] === body.section) delete map[k];
      meta.photoSection = map;
      break;
    }
    case "move-section": {
      const i = sections.findIndex((x) => x.id === body.section);
      const j = i + (body.dir < 0 ? -1 : 1);
      if (i < 0 || j < 0 || j >= sections.length) break;
      [sections[i], sections[j]] = [sections[j], sections[i]];
      meta.sections = sections;
      break;
    }
    case "assign": {
      const target = body.section;
      if (target && !sections.some((x) => x.id === target)) {
        return NextResponse.json({ error: await E("Nie ma takiej sekcji.") }, { status: 400 });
      }
      for (const n of (body.names ?? []).map(String)) {
        if (target) map[n] = target;
        else delete map[n];
      }
      meta.photoSection = map;
      break;
    }
    default:
      return NextResponse.json({ error: await E("Nieznana operacja.") }, { status: 400 });
  }

  await saveMeta(id, meta);
  return NextResponse.json({ ok: true });
}
