"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// Cienki pasek u góry strony od razu po kliknięciu w link lub zakładkę – widać, że coś się dzieje,
// zanim serwer odda nową stronę. Znika, gdy adres się zmieni.
function Bar() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // nowa strona gotowa
  useEffect(() => {
    setState((s) => (s === "loading" ? "done" : s));
    document.documentElement.classList.remove("nav-busy");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 350);
  }, [pathname, search]);

  useEffect(() => {
    const start = () => {
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
