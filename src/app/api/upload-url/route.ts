import { NextResponse } from "next/server";
import { E } from "@/lib/api-lang";
import { getLang } from "@/lib/lang-server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, BUCKET, isValidGalleryId, safeFileName, baseName, galleryPrefix } from "@/lib/r2";
import { getUser } from "@/lib/supabase/server";
import { getMeta, isExpired, watermarkOn } from "@/lib/galleries";
import { getGalleryUsage } from "@/lib/photos";
import { getPlan, hardLimitBytes, formatBytes, planBytes, MAX_PLAN } from "@/lib/plans";

export const runtime = "nodejs";

type FileInfo = { name: string; type: string; size?: number };

// Lżejsza wersja do oglądania zajmuje zwykle ok. 10–12% oryginału
const WEB_SHARE = 0.12;

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

// Zwraca podpisane linki, pod które przeglądarka wgrywa zdjęcia bezpośrednio do R2.
export async function POST(req: Request) {
  const { supabase, user } = await getUser();
  if (!user) {
    return NextResponse.json({ error: await E("Zaloguj się ponownie.") }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | { gallery?: string; files?: FileInfo[] }
    | null;
  if (!body) {
    return NextResponse.json({ error: await E("Nieprawidłowe dane.") }, { status: 400 });
  }

  const gallery = String(body.gallery ?? "");
  if (!isValidGalleryId(gallery)) {
    return NextResponse.json(
      { error: await E("Adres galerii może zawierać tylko małe litery, cyfry i myślniki.") },
      { status: 400 },
    );
  }

  // Wgrywać można tylko do własnej galerii
  const { data: own } = await supabase.from("galleries").select("id").eq("id", gallery).maybeSingle();
  if (!own) {
    return NextResponse.json({ error: await E("To nie jest Twoja galeria.") }, { status: 403 });
  }

  const files = Array.isArray(body.files) ? body.files.slice(0, 50) : [];
  if (files.length === 0) {
    return NextResponse.json({ error: await E("Nie wybrano żadnych zdjęć.") }, { status: 400 });
  }

  // Pakiet: musi być wybrany, aktywny i mieć wolne miejsce (z 2% zapasem)
  const meta = await getMeta(gallery);
  // Wersja robocza (bez pakietu) może zająć najwyżej tyle, ile największy pakiet
  const chosen = getPlan(meta?.plan);
  const plan = chosen ?? MAX_PLAN;
  if (isExpired(meta)) {
    return NextResponse.json(
      { error: await E("Dostęp do tej galerii wygasł. Przedłuż go, aby dodać zdjęcia."), code: "EXPIRED" },
      { status: 402 },
    );
  }
  const used = await getGalleryUsage(gallery);
  const wm = watermarkOn(meta);
  const incoming = files.reduce((sum, f) => sum + Math.max(0, Number(f.size) || 0), 0) * (1 + WEB_SHARE * (wm ? 2 : 1));
  if (used + incoming > hardLimitBytes(plan)) {
    const free = Math.max(0, planBytes(plan) - used);
    const en = (await getLang()) === "en";
    return NextResponse.json(
      {
        error: en
          ? chosen
            ? `These photos will not fit in the ${plan.nameEn} plan (${plan.limitGb} GB). Free space: ${formatBytes(free)}. Upgrade to a larger plan or choose fewer photos.`
            : `A gallery can have at most ${plan.limitGb} GB. Free space: ${formatBytes(free)}. Split the session into two galleries or choose fewer photos.`
          : chosen
          ? `Te zdjęcia nie zmieszczą się w pakiecie ${plan.name} (${plan.limitGb.toLocaleString("pl-PL")} GB). Wolne miejsce: ${formatBytes(free)}. Zmień pakiet na większy albo wybierz mniej zdjęć.`
          : `Galeria może mieć najwyżej ${plan.limitGb.toLocaleString("pl-PL")} GB. Wolne miejsce: ${formatBytes(free)}. Podziel sesję na dwie galerie albo wybierz mniej zdjęć.`,
        code: chosen ? "LIMIT" : "DRAFT_LIMIT",
      },
      { status: 402 },
    );
  }

  const prefix = galleryPrefix(gallery);
  const uploads = await Promise.all(
    files.map(async (f) => {
      const type = ALLOWED.includes(f.type) ? f.type : "image/jpeg";
      const name = safeFileName(String(f.name ?? "zdjecie.jpg"));
      const webName = `${baseName(name)}.jpg`;

      const originalUrl = await getSignedUrl(
        r2,
        new PutObjectCommand({ Bucket: BUCKET, Key: `${prefix}original/${name}`, ContentType: type }),
        { expiresIn: 3600 },
      );
      const webUrl = await getSignedUrl(
        r2,
        new PutObjectCommand({ Bucket: BUCKET, Key: `${prefix}web/${webName}`, ContentType: "image/jpeg" }),
        { expiresIn: 3600 },
      );

      const wmUrl = wm
        ? await getSignedUrl(
            r2,
            new PutObjectCommand({ Bucket: BUCKET, Key: `${prefix}wm/${webName}`, ContentType: "image/jpeg" }),
            { expiresIn: 3600 },
          )
        : undefined;

      return { name: f.name, type, originalUrl, webUrl, wmUrl };
    }),
  );

  return NextResponse.json({ gallery, uploads, watermark: wm ? meta?.watermark?.text : null });
}
