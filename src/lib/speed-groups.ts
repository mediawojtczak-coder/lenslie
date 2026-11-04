// Grupy stron do pomiaru szybkości – plik bez zależności serwerowych (używany też w przeglądarce)

export const SPEED_GROUPS = {
  home: "Strona główna",
  cennik: "Cennik i funkcje",
  konto: "Rejestracja i logowanie",
  "panel-lista": "Panel – lista galerii",
  "panel-galeria": "Panel – galeria",
  "panel-inne": "Panel – inne strony",
  admin: "Panel administratora",
  galeria: "Galeria klienta",
  inne: "Inne strony",
} as const;
export type SpeedGroup = keyof typeof SPEED_GROUPS;
export type SpeedKind = "load" | "nav";

export const isGroup = (v: unknown): v is SpeedGroup => typeof v === "string" && v in SPEED_GROUPS;

export function groupOf(path: string): SpeedGroup {
  if (path === "/") return "home";
  if (/^\/(cennik|funkcje|znajdz-siebie)(\/|$)/.test(path)) return "cennik";
  if (/^\/(rejestracja|logowanie|haslo)(\/|$)/.test(path)) return "konto";
  if (path === "/panel") return "panel-lista";
  if (path.startsWith("/panel/galeria/")) return "panel-galeria";
  if (path.startsWith("/panel")) return "panel-inne";
  if (path.startsWith("/admin")) return "admin";
  if (/^\/(galeria|goscie|domena)\//.test(path)) return "galeria";
  return "inne";
}

