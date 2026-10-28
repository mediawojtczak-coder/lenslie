import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, BUCKET, safeFileName, baseName, galleryPrefix } from "@/lib/r2";
import { getMeta, isExpired, watermarkOn } from "@/lib/galleries";
import { getGalleryUsage, listKeys } from "@/lib/photos";
import { getPlan, hardLimitBytes, formatBytes, planBytes, MAX_PLAN } from "@/lib/plans";

export type FileInfo = { name: string; type?: string; size?: number };
export type PreparedUpload = { name: string; file: string; type: string; originalUrl: string; webUrl: string; wmUrl?: string };
type Result =
  | { ok: true; uploads: PreparedUpload[]; watermark: string | null }
  | { ok: false; status: number; error: string; code?: string };

// Lżejsza wersja do oglądania zajmuje zwykle ok. 10–12% oryginału
const WEB_SHARE = 0.12;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

// Sprawdza miejsce w pakiecie i zwraca podpisane linki do wgrania zdjęć prosto do R2.
// withWm: czy wysyłający sam przygotuje wersję ze znakiem wodnym (przeglądarka tak, Lightroom nie –
// wtedy znak wodny nakłada panel, a klient nie widzi zdjęcia, dopóki go nie ma).
export async function prepareUploads(gallery: string, files: FileInfo[], lang: "pl" | "en", withWm = true): Promise<Result> {
  const en = lang === "en";
  const meta = await getMeta(gallery);
  // Wersja robocza (bez pakietu) może zająć najwyżej tyle, ile największy pakiet
  const chosen = getPlan(meta?.plan);
  const plan = chosen ?? MAX_PLAN;
  if (isExpired(meta)) {
    return {
      ok: false,
      status: 402,
      code: "EXPIRED",
      error: en ? "Access to this gallery has expired. Extend it to add photos." : "Dostęp do tej galerii wygasł. Przedłuż go, aby dodać zdjęcia.",
    };
  }
  const used = await getGalleryUsage(gallery);
  const wm = watermarkOn(meta);
  const incoming = files.reduce((sum, f) => sum + Math.max(0, Number(f.size) || 0), 0) * (1 + WEB_SHARE * (wm ? 2 : 1));
  if (used + incoming > hardLimitBytes(plan)) {
    const free = Math.max(0, planBytes(plan) - used);
    return {
      ok: false,
      status: 402,
      code: chosen ? "LIMIT" : "DRAFT_LIMIT",
      error: en
        ? chosen
          ? `These photos will not fit in the ${plan.nameEn} plan (${plan.limitGb} GB). Free space: ${formatBytes(free)}. Upgrade to a larger plan or choose fewer photos.`
          : `A gallery can have at most ${plan.limitGb} GB. Free space: ${formatBytes(free)}. Split the session into two galleries or choose fewer photos.`
        : chosen
          ? `Te zdjęcia nie zmieszczą się w pakiecie ${plan.name} (${plan.limitGb.toLocaleString("pl-PL")} GB). Wolne miejsce: ${formatBytes(free)}. Zmień pakiet na większy albo wybierz mniej zdjęć.`
          : `Galeria może mieć najwyżej ${plan.limitGb.toLocaleString("pl-PL")} GB. Wolne miejsce: ${formatBytes(free)}. Podziel sesję na dwie galerie albo wybierz mniej zdjęć.`,
    };
  }

  const prefix = galleryPrefix(gallery);
  const sign = (Key: string, ContentType: string) =>
    getSignedUrl(r2, new PutObjectCommand({ Bucket: BUCKET, Key, ContentType }), { expiresIn: 3600 });
  const uploads = await Promise.all(
    files.map(async (f) => {
      const type = f.type && ALLOWED.includes(f.type) ? f.type : "image/jpeg";
      const file = safeFileName(String(f.name ?? "zdjecie.jpg"));
      const webName = `${baseName(file)}.jpg`;
      return {
        name: f.name,
        file,
        type,
        originalUrl: await sign(`${prefix}original/${file}`, type),
        webUrl: await sign(`${prefix}web/${webName}`, "image/jpeg"),
        wmUrl: wm && withWm ? await sign(`${prefix}wm/${webName}`, "image/jpeg") : undefined,
      };
    }),
  );
  return { ok: true, uploads, watermark: wm ? (meta?.watermark?.text ?? null) : null };
}

// Usuwa zdjęcia (oryginał, wersję do oglądania i ze znakiem wodnym) po nazwach bez rozszerzenia
export async function deletePhotos(gallery: string, names: Set<string>) {
  const prefix = galleryPrefix(gallery);
  const keys = (await listKeys(prefix)).filter((key) => {
    const rest = key.slice(prefix.length);
    if (!rest.startsWith("web/") && !rest.startsWith("original/") && !rest.startsWith("wm/")) return false;
    return names.has(baseName(rest.split("/").pop() ?? ""));
  });
  for (let i = 0; i < keys.length; i += 10) {
    await Promise.all(keys.slice(i, i + 10).map((Key) => r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key }))));
  }
  return keys.length;
}
