// Statystyki galerii: zgłoszenie zdarzenia z przeglądarki klienta (obsługuje je komponent Track)
export function track(kind: string, photo?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("lenslie:track", { detail: { kind, photo } }));
}
