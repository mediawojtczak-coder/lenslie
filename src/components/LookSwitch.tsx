"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "./LangProvider";

// Wygląd panelu: Klasyczny Lenslie albo Ciemny – zmiana od razu, bez przeładowania strony
export default function LookSwitch({ initial }: { initial: "classic" | "dark" }) {
  const lang = useLang();
  const router = useRouter();
  const [look, setLook] = useState(initial);
  const t = (pl: string, en: string) => (lang === "en" ? en : pl);

  async function set(l: "classic" | "dark") {
    if (l === look) return;
    setLook(l);
    document.querySelector(".app")?.classList.toggle("ui-dark", l === "dark");
    await fetch("/api/ui-look", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ look: l }) }).catch(() => undefined);
    router.refresh();
  }

  return (
    <div className="ui-look">
      <p>{t("Wygląd panelu", "Dashboard look")}</p>
      <div className="ui-look-opts" role="group" aria-label={t("Wygląd panelu", "Dashboard look")}>
        <button type="button" className={`lk-classic${look === "classic" ? " on" : ""}`} aria-pressed={look === "classic"} onClick={() => set("classic")}>
          <i aria-hidden="true" />
          {t("Klasyczny", "Classic")}
        </button>
        <button type="button" className={`lk-dark${look === "dark" ? " on" : ""}`} aria-pressed={look === "dark"} onClick={() => set("dark")}>
          <i aria-hidden="true" />
          {t("Ciemny", "Dark")}
        </button>
      </div>
    </div>
  );
}
