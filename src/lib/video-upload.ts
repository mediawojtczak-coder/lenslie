// Wgrywanie dużych filmów z przeglądarki prosto do R2 – w częściach po 64 MB, kilka naraz, z ponawianiem.
// Oryginał trafia do magazynu bez żadnej zmiany jakości.

const PARALLEL = 4;
const L = (pl: string, en: string) => (typeof document !== "undefined" && document.documentElement.lang === "en" ? en : pl);

// Długość filmu odczytana z pliku (do wyceny). 0, gdy przeglądarka nie zna formatu.
export function readDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    const url = URL.createObjectURL(file);
    const done = (d: number) => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(d) ? d : 0);
    };
    v.preload = "metadata";
    v.onloadedmetadata = () => done(v.duration);
    v.onerror = () => done(0);
    setTimeout(() => done(0), 15000);
    v.src = url;
  });
}

function putPart(url: string, blob: Blob, onProgress: (loaded: number) => void, signal: { aborted: boolean; xhrs: Set<XMLHttpRequest> }) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    signal.xhrs.add(xhr);
    xhr.open("PUT", url);
    xhr.upload.onprogress = (e) => onProgress(e.loaded);
    xhr.onload = () => {
      signal.xhrs.delete(xhr);
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`${L("Wgrywanie części nie powiodło się", "Part upload failed")} (${xhr.status})`));
    };
    xhr.onerror = () => {
      signal.xhrs.delete(xhr);
      reject(new Error(L("Brak połączenia.", "No connection.")));
    };
    xhr.onabort = () => {
      signal.xhrs.delete(xhr);
      reject(new Error("abort"));
    };
    xhr.send(blob);
  });
}

export type VideoUpload = { done: Promise<unknown>; cancel: () => void };

export function uploadVideo(endpoint: string, file: File, duration: number, onProgress: (fraction: number) => void): VideoUpload {
  const signal = { aborted: false, xhrs: new Set<XMLHttpRequest>() };
  let videoId = "";
  const api = async (body: Record<string, unknown>) => {
    const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? L("Błąd serwera.", "Server error."));
    return data;
  };

  const run = async () => {
    const init = await api({ action: "init", name: file.name, size: file.size, type: file.type, duration });
    videoId = init.videoId;
    const partSize: number = init.partSize;
    const total: number = init.parts;
    const loaded = new Map<number, number>();
    const report = () => onProgress(Math.min(0.995, [...loaded.values()].reduce((s, n) => s + n, 0) / file.size));
    const urls: Record<number, string> = {};
    let next = 1;

    const getUrl = async (n: number) => {
      if (!urls[n]) {
        const batch = Array.from({ length: Math.min(50, total - n + 1) }, (_, i) => n + i);
        Object.assign(urls, (await api({ action: "parts", videoId, parts: batch })).urls);
      }
      return urls[n];
    };

    const worker = async () => {
      while (next <= total && !signal.aborted) {
        const n = next++;
        const blob = file.slice((n - 1) * partSize, Math.min(file.size, n * partSize));
        for (let attempt = 1; ; attempt++) {
          try {
            await putPart(await getUrl(n), blob, (l) => {
              loaded.set(n, l);
              report();
            }, signal);
            loaded.set(n, blob.size);
            report();
            break;
          } catch (err) {
            if (signal.aborted || attempt >= 4) throw err;
            await new Promise((r) => setTimeout(r, 1500 * attempt));
          }
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(PARALLEL, total) }, worker));
    if (signal.aborted) throw new Error("abort");
    const done = await api({ action: "complete", videoId });
    onProgress(1);
    return done.video;
  };

  const done = run().catch(async (err) => {
    if (videoId) await api({ action: "abort", videoId }).catch(() => undefined);
    throw err;
  });

  return {
    done,
    cancel: () => {
      signal.aborted = true;
      signal.xhrs.forEach((x) => x.abort());
    },
  };
}
