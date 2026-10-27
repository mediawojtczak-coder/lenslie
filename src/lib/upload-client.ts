// Wgrywanie zdjęć z przeglądarki prosto do R2 (używane w panelu galerii)
import { drawWatermark, canvasToJpeg } from "@/lib/watermark-client";

// Język strony (z <html lang>), żeby komunikaty błędów pasowały do panelu
const L = (pl: string, en: string) => (typeof document !== "undefined" && document.documentElement.lang === "en" ? en : pl);

type Upload = { name: string; type: string; originalUrl: string; webUrl: string; wmUrl?: string };

export type FileStatus = "queued" | "preparing" | "uploading" | "done" | "error" | "canceled";
export type FileState = { status: FileStatus; progress: number; error?: string };

const WEB_MAX = 2048; // dłuższy bok wersji do oglądania
const PARALLEL = 3;

// Tworzy lżejszą wersję zdjęcia do galerii (JPEG, max 2048 px), a gdy trzeba – także wersję ze znakiem wodnym
async function makeWebVersion(file: File, watermark?: string): Promise<{ web: Blob; wm?: Blob }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, WEB_MAX / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error(L("Przeglądarka nie obsługuje przetwarzania zdjęć.", "This browser cannot process photos."));
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const web = await canvasToJpeg(canvas);
  if (!watermark) return { web };
  drawWatermark(ctx, w, h, watermark);
  return { web, wm: await canvasToJpeg(canvas) };
}

class Canceled extends Error {
  constructor() {
    super(L("Anulowano", "Cancelled"));
    this.name = "Canceled";
  }
}

// Wysyła plik z postępem (fetch nie podaje postępu wysyłania, dlatego XMLHttpRequest)
function put(url: string, body: Blob, type: string, onProgress: (loaded: number) => void, onXhr: (x: XMLHttpRequest | null) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    onXhr(xhr);
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", type);
    xhr.upload.onprogress = (e) => onProgress(e.loaded);
    xhr.onload = () => {
      onXhr(null);
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`${L("Wgrywanie nie powiodło się", "Upload failed")} (${xhr.status}).`));
    };
    xhr.onerror = () => {
      onXhr(null);
      reject(new Error(L("Brak połączenia. Spróbuj ponownie.", "No connection. Please try again.")));
    };
    xhr.onabort = () => {
      onXhr(null);
      reject(new Canceled());
    };
    xhr.send(body);
  });
}

export type UploadJob = {
  done: Promise<void>;
  cancel: (index?: number) => void;
};

// Przesyła zdjęcia po kilka naraz. onState zgłasza stan każdego pliku (kolejka, postęp, gotowe, błąd).
// Błąd po stronie serwera (np. brak miejsca w pakiecie) kończy całe przesyłanie wyjątkiem z polem code.
export function uploadPhotos(
  gallery: string,
  files: File[],
  onState: (index: number, state: FileState) => void,
  // Inny adres do pobrania linków wysyłki (np. galeria gości wesela)
  endpoint = "/api/upload-url",
): UploadJob {
  const canceled = new Set<number>();
  const active = new Map<number, XMLHttpRequest>();
  let all = false;

  const cancel = (index?: number) => {
    if (index === undefined) {
      all = true;
      files.forEach((_, i) => canceled.add(i));
      active.forEach((x) => x.abort());
      return;
    }
    canceled.add(index);
    active.get(index)?.abort();
    onState(index, { status: "canceled", progress: 0 });
  };

  const run = async () => {
    for (let start = 0; start < files.length && !all; start += 50) {
      const batch = files.slice(start, start + 50);
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gallery, files: batch.map((f) => ({ name: f.name, type: f.type, size: f.size })) }),
      });
      const data = await res.json();
      if (!res.ok) {
        for (let i = start; i < files.length; i++) {
          if (!canceled.has(i)) onState(i, { status: "error", progress: 0, error: data.error });
        }
        const err = new Error(data.error ?? L("Błąd serwera.", "Server error.")) as Error & { code?: string };
        err.code = data.code;
        throw err;
      }
      const uploads: Upload[] = data.uploads;
      const watermark: string | undefined = data.watermark || undefined;

      let next = 0;
      const worker = async () => {
        while (next < batch.length && !all) {
          const local = next++;
          const i = start + local;
          if (canceled.has(i)) continue;
          const file = batch[local];
          const up = uploads[local];
          try {
            onState(i, { status: "preparing", progress: 0 });
            const { web, wm } = await makeWebVersion(file, up.wmUrl ? watermark : undefined);
            if (canceled.has(i)) continue;

            // Postęp liczony po bajtach wszystkich wersji tego zdjęcia
            const total = file.size + web.size + (wm?.size ?? 0);
            let sent = 0;
            const step = (blob: Blob, url: string, type: string) =>
              put(
                url,
                blob,
                type,
                (loaded) => onState(i, { status: "uploading", progress: Math.min(0.99, (sent + loaded) / total) }),
                (x) => (x ? active.set(i, x) : active.delete(i)),
              ).then(() => {
                sent += blob.size;
              });

            onState(i, { status: "uploading", progress: 0 });
            await step(file, up.originalUrl, up.type);
            await step(web, up.webUrl, "image/jpeg");
            if (wm && up.wmUrl) await step(wm, up.wmUrl, "image/jpeg");
            onState(i, { status: "done", progress: 1 });
          } catch (err) {
            if (err instanceof Canceled || canceled.has(i)) {
              onState(i, { status: "canceled", progress: 0 });
            } else {
              onState(i, { status: "error", progress: 0, error: err instanceof Error ? err.message : L("Błąd", "Error") });
            }
          }
        }
      };
      await Promise.all(Array.from({ length: PARALLEL }, worker));
    }
  };

  return { done: run(), cancel };
}
