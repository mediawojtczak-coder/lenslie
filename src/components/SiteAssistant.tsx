"use client";

import { useEffect, useState } from "react";
import PanelAssistant from "@/components/PanelAssistant";

// Asystent na stronie: dla wszystkich, gdy włączony (ASSISTANT_PUBLIC=1); w testach – tylko w przeglądarce,
// która weszła na stronę z ?ai=test (ustawia ciasteczko lenslie_ai=1 na 30 dni; ?ai=off je usuwa)
export default function SiteAssistant({ on }: { on: boolean }) {
  const [show, setShow] = useState(on);
  useEffect(() => {
    if (on) return;
    const q = new URLSearchParams(location.search).get("ai");
    if (q === "test") document.cookie = "lenslie_ai=1; path=/; max-age=2592000; samesite=lax; secure";
    if (q === "off") document.cookie = "lenslie_ai=; path=/; max-age=0";
    setShow(q !== "off" && (q === "test" || document.cookie.split("; ").includes("lenslie_ai=1")));
  }, [on]);
  return show ? <PanelAssistant mode="site" /> : null;
}
