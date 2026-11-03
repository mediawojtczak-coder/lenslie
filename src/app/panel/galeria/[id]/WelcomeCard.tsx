"use client";

import { useEffect, useRef, useState } from "react";
import { useTr } from "@/components/LangProvider";

// Wiadomość powitalna dla klienta – osobna zakładka galerii, zapisuje się sama chwilę po wpisaniu
export default function WelcomeCard({ id, welcome }: { id: string; welcome: string }) {
  const t = useTr();
  const [text, setText] = useState(welcome);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saved = useRef(welcome);

  useEffect(() => {
    if (text === saved.current) return;
    const timer = setTimeout(async () => {
      setState("saving");
      try {
        const res = await fetch("/api/galleries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gallery: id, welcome: text }),
        });
        if (!res.ok) throw new Error();
        saved.current = text;
        setState("saved");
      } catch {
        setState("error");
      }
    }, 900);
    return () => clearTimeout(timer);
  }, [text, id]);

  return (
    <div className="settings-card welcome-card">
      <h2>{t("Wiadomość powitalna", "Welcome message")}</h2>
      <p className="hint-inline">
        {t(
          "Krótki tekst dla klienta, widoczny w galerii nad zdjęciami. Zostaw puste, jeśli nie chcesz go pokazywać.",
          "A short note for your client, shown in the gallery above the photos. Leave empty to hide it.",
        )}
      </p>
      <textarea
        id="welcome-text"
        aria-label={t("Wiadomość powitalna", "Welcome message")}
        rows={7}
        maxLength={1500}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setState("idle");
        }}
        placeholder={t("np. Kochani, dziękuję, że mogłam być z Wami tego dnia. Miłego oglądania!", "e.g. Dear both, thank you for having me on your day. Enjoy!")}
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
