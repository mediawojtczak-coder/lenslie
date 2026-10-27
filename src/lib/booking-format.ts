// Formatowanie terminów rezerwacji (działa w przeglądarce i na serwerze)
type L = "pl" | "en";
type S = { date: string; time: string };

export function dayLabel(date: string, lang: L, withYear = true) {
  return new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(withYear ? { year: "numeric" as const } : {}),
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

export const slotLabel = (s: S, lang: L) => `${dayLabel(s.date, lang)}, ${s.time}`;
