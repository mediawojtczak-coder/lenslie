// Wgrywanie zdjęć z przeglądarki prosto do R2 (używane w panelu galerii)

type Upload = { name: string; type: string; originalUrl: string; webUrl: string };

const WEB_MAX = 2048; // dłuższy bok wersji do oglądania

// Tworzy lżejszą wersję zdjęcia do galerii (JPEG, max 2048 px)
async function makeWebVersion(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, WEB_MAX / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Przeglądarka nie obsługuje przetwarzania zdjęć.");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Nie udało się przetworzyć zdjęcia."))), "image/jpeg", 0.85),
  );
}

async function put(url: string, body: Blob, type: string) {
  const res = await fetch(url, { method: "PUT", body, headers: { "Content-Type": type } });
  if (!res.ok) throw new Error(`Wgrywanie nie powiodło się (${res.status}).`);
}

export async function uploadPhotos(gallery: string, files: File[], onProgress: (done: number) => void) {
  let done = 0;
  for (let start = 0; start < files.length; start += 50) {
    const batch = files.slice(start, start + 50);
    const res = await fetch("/api/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gallery, files: batch.map((f) => ({ name: f.name, type: f.type })) }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Błąd serwera.");
    const uploads: Upload[] = data.uploads;

    // Po 3 zdjęcia naraz
    let next = 0;
    const worker = async () => {
      while (next < batch.length) {
        const i = next++;
        const web = await makeWebVersion(batch[i]);
        await put(uploads[i].originalUrl, batch[i], uploads[i].type);
        await put(uploads[i].webUrl, web, "image/jpeg");
        done += 1;
        onProgress(done);
      }
    };
    await Promise.all([worker(), worker(), worker()]);
  }
}
