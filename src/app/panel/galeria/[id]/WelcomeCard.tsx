"use client";

import { useEffect, useRef, useState } from "react";
import { useTr } from "@/components/LangProvider";

type Field = "welcome" | "note";

// Pole tekstowe galerii zapisywane samo chwilę po wpisaniu:
// „welcome” – wiadomość powitalna dla klienta, „note” – prywatna notatka fotografa (klient jej nie widzi)
export default function WelcomeCard({ id, welcome, field = "welcome" }: { id: string; welcome: string; field?: Field }) {
  const t = useTr();
  const [text, setText] = useState(welcome);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saved = useRef(welcome);
  const isNote = field === "note";

  useEffect(() => {
    if (text === saved.current) return;
    const timer = setTimeout(async () => {
      setState("saving");
      try {
        const res = await fetch("/api/galleries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gallery: id, [field]: text }),
        });
        if (!res.ok) throw new Error();
        saved.current = text;
        setState("saved");
      } catch {
        setState("error");
      }
    }, 900);
    return () => clearTimeout(timer);
  }, [text, id, field]);

  return (
    <div className="settings-card welcome-card">
      <h2>{isNote ? t("Notatka", "Note") : t("Wiadomość powitalna", "Welcome message")}</h2>
      <p className="hint-inline">
        {isNote
          ? t(
              "Twoja prywatna notatka do tej galerii – np. ustalenia z klientem, terminy, wybrane zdjęcia do albumu. Klient jej nie widzi. Widać ją też na kafelku galerii na liście.",
              "Your private note for this gallery – e.g. agreements with the client, deadlines, album picks. Your client never sees it. It also shows on the gallery tile in your list.",
            )
          : t(
              "Krótki tekst dla klienta, widoczny w galerii nad zdjęciami. Zostaw puste, jeśli nie chcesz go pokazywać.",
              "A short note for your client, shown in the gallery above the photos. Leave empty to hide it.",
            )}
      </p>
      <textarea
        id="welcome-text"
        aria-label={isNote ? t("Notatka", "Note") : t("Wiadomość powitalna", "Welcome message")}
        rows={7}
        maxLength={isNote ? 2000 : 1500}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setState("idle");
        }}
        placeholder={
          isNote
            ? t("np. Album 30×30 do 15 grudnia, mama panny młodej chce odbitki 13×18", "e.g. 30×30 album by 15 December, bride's mother wants 5×7 prints")
            : t("np. Kochani, dziękuję, że mogłam być z Wami tego dnia. Miłego oglądania!", "e.g. Dear both, thank you for having me on your day. Enjoy!")
        }
      />
      <small aria-live="polite">
        {state === "saving"
          ? t("Zapisuję…", "Saving…")
          : state === "saved"
            ? `✓ ${t("Zapisano", "Saved")}`
            : state === "error"
              ? t("Nie udało się zapisać – spróbuj jeszcze raz.", "Could not save – try again.")
              : t("Zapisuje się sama chwilę po wpisaniu.", "Saves automatically as you type.")}
      </small>
    </div>
  );
}
