// Wgrywanie dużych filmów z przeglądarki prosto do R2 – w częściach, kilka naraz, z ponawianiem i wznawianiem.
// Oryginał trafia do magazynu bez żadnej zmiany jakości.
// Przy zerwaniu połączenia czekamy na sieć i próbujemy dalej; gdy to nie pomoże, wybranie tego samego pliku
// jeszcze raz wznawia wgrywanie od miejsca przerwania (części już wgrane są pomijane).

const PARALLEL = 3;
const MAX_ATTEMPTS = 30; // na jedną część (przy braku sieci czekamy dodatkowo, aż wróci)
const STALL_MS = 90_000; // brak postępu przez tyle czasu = połączenie zawieszone, ponawiamy
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

type Signal = { aborted: boolean; xhrs: Set<XMLHttpRequest> };
class PartError extends Error {
  constructor(message: string, public status = 0) {
    super(message);
  }
}

function putPart(url: string, blob: Blob, onProgress: (loaded: number) => void, signal: Signal) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    signal.xhrs.add(xhr);
    let stalled = false;
    let timer = setTimeout(stall, STALL_MS);
    function stall() {
      stalled = true;
      xhr.abort();
    }
    const finish = () => {
      clearTimeout(timer);
      signal.xhrs.delete(xhr);
    };
    xhr.open("PUT", url);
    xhr.upload.onprogress = (e) => {
      clearTimeout(timer);
      timer = setTimeout(stall, STALL_MS);
      onProgress(e.loaded);
    };
    xhr.onload = () => {
      finish();
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new PartError(`${L("Wgrywanie części nie powiodło się", "Part upload failed")} (${xhr.status})`, xhr.status));
    };
    xhr.onerror = () => {
      finish();
      reject(new PartError(L("Brak połączenia.", "No connection.")));
    };
    xhr.onabort = () => {
      finish();
      reject(stalled && !signal.aborted ? new PartError(L("Połączenie się zawiesiło.", "The connection stalled.")) : new Error("abort"));
    };
    xhr.send(blob);
  });
}

// Przerwa przed ponowieniem; gdy nie ma sieci – czekamy (do 10 minut), aż wróci
async function waitOnline(ms: number) {
  if (!navigator.onLine) {
    await new Promise<void>((resolve) => {
      const t = setTimeout(done, 600_000);
      function done() {
        clearTimeout(t);
        window.removeEventListener("online", done);
        resolve();
      }
      window.addEventListener("online", done);
    });
  }
  await new Promise((r) => setTimeout(r, ms));
}

// Nie pozwalamy komputerowi zasnąć w trakcie wgrywania (gdzie przeglądarka to obsługuje)
type WakeLock = { release: () => Promise<void> };
async function keepAwake(): Promise<WakeLock | null> {
  try {
    const wl = (navigator as unknown as { wakeLock?: { request: (t: "screen") => Promise<WakeLock> } }).wakeLock;
    return wl ? await wl.request("screen") : null;
  } catch {
    return null;
  }
}

export type VideoProgress = { fraction: number; sent: number; total: number; resumed: boolean; retrying?: number; speed?: number };
// Szczegóły ostatniego błędu – wysyłane do Lenslie, żeby można było zdiagnozować problem
type Failure = { part: number; offset: number; status: number; message: string; attempts: number };
export type VideoUpload = { done: Promise<unknown>; cancel: () => void };

export function uploadVideo(endpoint: string, file: File, duration: number, onProgress: (p: VideoProgress) => void): VideoUpload {
  const signal: Signal = { aborted: false, xhrs: new Set() };
  let videoId = "";
  const api = async (body: Record<string, unknown>) => {
    const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? L("Błąd serwera.", "Server error."));
    return data;
  };

  let failure: Failure | null = null;
  let lastSent = 0;
  let errors = 0; // liczba błędów – po kilku zmniejszamy liczbę równoległych połączeń
  const run = async () => {
    const init = await api({ action: "init", name: file.name, size: file.size, type: file.type, duration });
    videoId = init.videoId;
    const partSize: number = init.partSize;
    const total: number = init.parts;
    const resumed = Boolean(init.resumed);
    const done = new Set<number>((init.done as number[] | undefined) ?? []);
    const loaded = new Map<number, number>();
    for (const n of done) loaded.set(n, Math.min(file.size, n * partSize) - (n - 1) * partSize);
    // prędkość liczona z ostatnich ~20 sekund
    const samples: { t: number; sent: number }[] = [];
    let retrying = 0;
    const report = () => {
      const sent = [...loaded.values()].reduce((s, n) => s + n, 0);
      lastSent = sent;
      const now = Date.now();
      samples.push({ t: now, sent });
      while (samples.length > 2 && now - samples[0].t > 20_000) samples.shift();
      const dt = (now - samples[0].t) / 1000;
      const speed = dt > 3 ? Math.max(0, (sent - samples[0].sent) / dt) : undefined;
      onProgress({ fraction: Math.min(0.995, sent / file.size), sent, total: file.size, resumed, retrying: retrying || undefined, speed });
    };
    report();
    const urls: Record<number, string> = {};
    const queue = Array.from({ length: total }, (_, i) => i + 1).filter((n) => !done.has(n));

    const getUrl = async (n: number) => {
      if (!urls[n]) {
        const batch = queue.filter((q) => q >= n && !urls[q]).slice(0, 50);
        Object.assign(urls, (await api({ action: "parts", videoId, parts: batch.length ? batch : [n] })).urls);
      }
      return urls[n];
    };

    const worker = async (w: number) => {
      while (queue.length && !signal.aborted) {
        // po wielu błędach zostawiamy mniej równoległych połączeń (słabe łącze)
        if (w > 0 && errors >= 6 * w) {
          await new Promise((r) => setTimeout(r, 1000));
          if (queue.length && errors >= 6 * w) return;
        }
        const n = queue.shift()!;
        const blob = file.slice((n - 1) * partSize, Math.min(file.size, n * partSize));
        for (let attempt = 1; ; attempt++) {
          try {
            await putPart(await getUrl(n), blob, (l) => {
              loaded.set(n, l);
              report();
            }, signal);
            loaded.set(n, blob.size);
            if (retrying) retrying = 0;
            report();
            break;
          } catch (err) {
            errors++;
            failure = {
              part: n,
              offset: (n - 1) * partSize,
              status: err instanceof PartError ? err.status : -1,
              message: err instanceof Error ? err.message : String(err),
              attempts: attempt,
            };
            if (signal.aborted || attempt >= MAX_ATTEMPTS) throw err;
            loaded.set(n, 0);
            retrying = Math.max(retrying, attempt);
            report();
            // odrzucony adres (przeglądarka może to zgłosić jako „brak połączenia”) – od 2. próby pobieramy nowy
            if (attempt >= 2 || (err instanceof PartError && err.status >= 400)) delete urls[n];
            await waitOnline(Math.min(60_000, 2000 * attempt));
          }
        }
      }
    };

    const lock = await keepAwake();
    try {
      await Promise.all(Array.from({ length: Math.min(PARALLEL, queue.length) }, (_, w) => worker(w)));
    } finally {
      lock?.release().catch(() => undefined);
    }
    if (signal.aborted) throw new Error("abort");
    const result = await api({ action: "complete", videoId });
    onProgress({ fraction: 1, sent: file.size, total: file.size, resumed });
    return result.video;
  };

  const done = run().catch(async (err) => {
    // Anulowanie przez fotografa – usuwamy rozpoczęte wgrywanie.
    // Błąd sieci – zostawiamy wgrane części, żeby można było wznowić tym samym plikiem.
    if (videoId && signal.aborted) await api({ action: "abort", videoId }).catch(() => undefined);
    // zgłoszenie problemu do Lenslie (bez danych z pliku – tylko numer części, kod błędu i przeglądarka)
    if (!signal.aborted && videoId && failure) {
      await api({
        action: "report",
        videoId,
        ...(failure as Failure),
        size: file.size,
        sent: lastSent,
        online: navigator.onLine,
        ua: navigator.userAgent,
      }).catch(() => undefined);
    }
    if (!signal.aborted && videoId && err instanceof PartError) {
      throw new Error(
        `${err.message} ${L(
          "Wgrane części są zapisane – kliknij „Wznów wgrywanie” (albo wybierz ten sam plik przez „Dodaj film”), a wgrywanie ruszy od miejsca przerwania.",
          "Uploaded parts are saved – click “Resume upload” (or choose the same file with “Add video”) and the upload continues where it stopped.",
        )}`,
      );
    }
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
