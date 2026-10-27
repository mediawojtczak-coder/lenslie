"use client";

import { useEffect, useRef, useState } from "react";
import { saveZip, type ZipItem, type ZipKind } from "@/lib/zip-client";

// Przycisk pobierania wielu zdjęć jako ZIP (cała galeria albo jedna sekcja)
export default function DownloadAll({
  items,
  zipName,
  label = "Pobierz wszystkie",
  small = false,
  allowFull = true,
  onDone,
}: {
  items: ZipItem[];
  zipName: string;
  label?: string;
  small?: boolean;
  allowFull?: boolean;
  onDone?: (kind: ZipKind) => void;
}) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [count, setCount] = useState(0);
  const [menu, setMenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenu(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menu]);

  async function run(kind: ZipKind) {
    setMenu(false);
    setState("busy");
    setCount(0);
    try {
      const saved = await saveZip(items, zipName, kind, () => setCount((c) => c + 1));
      setState(saved ? "done" : "idle");
      if (saved) onDone?.(kind);
    } catch {
      setState("error");
    }
  }

  return (
    <div className={small ? "download-all small" : "download-all"} ref={ref}>
      <button
        className={small ? "btn btn-ghost btn-small" : "btn btn-ghost"}
        type="button"
        onClick={() => (allowFull ? setMenu((v) => !v) : run("web"))}
        disabled={state === "busy"}
        aria-haspopup={allowFull ? "menu" : undefined}
        aria-expanded={allowFull ? menu : undefined}
      >
        {state === "busy" ? `Przygotowuję… ${count} z ${items.length}` : label}
      </button>
      {menu && (
        <div className="dl-pop dl-pop-down" role="menu">
          <button type="button" role="menuitem" onClick={() => run("full")}>
            <strong>Pełna rozdzielczość</strong>
            <span>Oryginały do druku i albumu</span>
          </button>
          <button type="button" role="menuitem" onClick={() => run("web")}>
            <strong>Do internetu</strong>
            <span>Mniejsze pliki, szybsze pobieranie</span>
          </button>
        </div>
      )}
      {state === "done" && <p className="hint-center">Pobieranie zakończone.</p>}
      {state === "error" && (
        <p className="error hint-center" role="alert">
          Nie udało się pobrać wszystkich zdjęć. Odśwież stronę i spróbuj ponownie.
        </p>
      )}
    </div>
  );
}
