"use client";

import { useEffect, useRef, useState } from "react";
import { useTr } from "@/components/LangProvider";

// Wiadomość powitalna dla klienta – w lewym pasku galerii, zapisuje się sama chwilę po wpisaniu
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
    <div className="g-side-welcome">
      <label htmlFor="side-welcome">{t("Wiadomość powitalna", "Welcome message")}</label>
      <textarea
        id="side-welcome"
        rows={4}
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
              : t("Klient zobaczy ją nad zdjęciami. Zapisuje się sama.", "Your client sees it above the photos. Saves automatically.")}
      </small>
    </div>
  );
}
