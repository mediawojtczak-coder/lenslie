"use client";

// Zapis zdjęcia prosto do galerii telefonu: plik pobieramy w tle i otwieramy systemowe „Udostępnij”,
// gdzie jest „Zapisz obraz” (iPhone) / „Zapisz w galerii” (Android) – bez przechodzenia na inną stronę.

const cache = new Map<string, File>();

export function canSaveToPhone(): boolean {
  if (typeof navigator === "undefined" || typeof window === "undefined") return false;
  if (!("share" in navigator) || !("canShare" in navigator)) return false;
  // tylko telefony i tablety – na komputerze zostaje zwykłe pobieranie
  if (!window.matchMedia?.("(pointer: coarse)").matches) return false;
  try {
    return navigator.canShare({ files: [new File([""], "x.jpg", { type: "image/jpeg" })] });
  } catch {
    return false;
  }
}

export const cachedPhoto = (url: string) => cache.get(url) ?? null;

export async function loadPhoto(url: string, name: string): Promise<File> {
  const hit = cache.get(url);
  if (hit) return hit;
  const res = await fetch(url, { mode: "cors", credentials: "omit" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const type = blob.type && blob.type.startsWith("image/") ? blob.type : "image/jpeg";
  const file = new File([blob], name || "zdjecie.jpg", { type });
  cache.clear(); // trzymamy tylko ostatnie zdjęcie – pełne pliki są duże
  cache.set(url, file);
  return file;
}

// "saved" | "cancelled" | "needs-tap" (przeglądarka chce drugiego dotknięcia) | "failed" (np. brak CORS)
export async function sharePhoto(file: File): Promise<"saved" | "cancelled" | "needs-tap" | "failed"> {
  try {
    await navigator.share({ files: [file] });
    return "saved";
  } catch (e) {
    const n = (e as { name?: string })?.name;
    if (n === "AbortError") return "cancelled";
    if (n === "NotAllowedError") return "needs-tap";
    return "failed";
  }
}
