"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { groupOf } from "@/lib/speed-groups";

// Pomiar szybkości (bez cookies): czas pierwszego załadowania i przejść między stronami
function sendSpeed(kind: "load" | "nav", path: string, ms: number, ttfb = 0) {
  if (!(ms > 0) || ms > 120_000) return;
  const body = JSON.stringify({ kind, group: groupOf(path), ms: Math.round(ms), ttfb: Math.round(ttfb) });
  try {
    if (navigator.sendBeacon?.("/api/speed", new Blob([body], { type: "application/json" }))) return;
  } catch {}
  fetch("/api/speed", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => undefined);
}
let navStart: number | null = null;

// Cienki pasek u góry strony od razu po kliknięciu w link lub zakładkę – widać, że coś się dzieje,
// zanim serwer odda nową stronę. Znika, gdy adres się zmieni.
function Bar() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // pierwsze wejście: czas do pełnego załadowania i odpowiedź serwera (raz na kartę)
  useEffect(() => {
    const measure = () => {
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      if (nav && nav.loadEventEnd > 0) sendSpeed("load", location.pathname, nav.loadEventEnd, nav.responseStart);
    };
    if (document.readyState === "complete") setTimeout(measure, 0);
    else window.addEventListener("load", () => setTimeout(measure, 0), { once: true });
  }, []);

  // nowa strona gotowa
  useEffect(() => {
    if (navStart !== null) {
      sendSpeed("nav", pathname, performance.now() - navStart);
      navStart = null;
    }
    setState((s) => (s === "loading" ? "done" : s));
    document.documentElement.classList.remove("nav-busy");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 350);
  }, [pathname, search]);

  useEffect(() => {
    const start = () => {
      navStart = performance.now();
      if (timer.current) clearTimeout(timer.current);
      setState("loading");
      document.documentElement.classList.add("nav-busy");
      // bezpiecznik – gdyby nawigacja się nie odbyła
      timer.current = setTimeout(() => {
        setState("idle");
        document.documentElement.classList.remove("nav-busy");
      }, 20000);
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || !a.href || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return; // ten sam adres (np. #kotwica)
      start();
    };
    const onSubmit = (e: Event) => {
      const f = e.target as HTMLFormElement;
      if (f.method?.toLowerCase() === "get" && f.action) start();
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    window.addEventListener("lenslie:navigate", start);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
      window.removeEventListener("lenslie:navigate", start);
    };
  }, []);

  return <div className={`nav-progress ${state}`} aria-hidden="true" />;
}

export default function NavProgress() {
  return (
    <Suspense fallback={null}>
      <Bar />
    </Suspense>
  );
}
