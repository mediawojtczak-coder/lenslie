"use client";

import { useRouter } from "next/navigation";
import { useLang } from "./LangProvider";
import { fromEn, isSitePath, toEn } from "@/lib/en-paths";

// Przełącznik PL / EN
export default function LangSwitch({ className = "" }: { className?: string }) {
  const lang = useLang();
  const router = useRouter();

  async function set(l: "pl" | "en") {
    if (l === lang) return;
    await fetch("/api/lang", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lang: l }) });
    // strony informacyjne mają osobne adresy: /cennik ↔ /en/pricing
    const path = window.location.pathname;
    const onEn = path === "/en" || path.startsWith("/en/");
    const target = l === "pl" && onEn ? fromEn(path) : l === "en" && !onEn && isSitePath(path) ? toEn(path) : null;
    if (target) {
      window.location.href = target + window.location.search.replace(/([?&])lang=(en|pl)&?/, "$1").replace(/[?&]$/, "") + window.location.hash;
      return;
    }
    router.refresh();
  }

  return (
    <div className={`lang-switch ${className}`} role="group" aria-label="Language / Język">
      {(["pl", "en"] as const).map((l) => (
        <button key={l} type="button" className={lang === l ? "on" : ""} aria-pressed={lang === l} onClick={() => set(l)}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
