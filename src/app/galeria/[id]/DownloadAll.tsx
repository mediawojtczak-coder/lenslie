"use client";

import { useEffect, useRef, useState } from "react";
import { downloadZip } from "client-zip";

type Item = { url: string; fileName: string; webUrl: string; webFileName: string };
type Kind = "full" | "web";

type SaveWindow = Window & {
  showSaveFilePicker?: (options: {
    suggestedName?: string;
    types?: { description: string; accept: Record<string, string[]> }[];
  }) => Promise<{ createWritable: () => Promise<WritableStream<Uint8Array>> }>;
};

// Składa ZIP ze wszystkich oryginałów bezpośrednio w przeglądarce klienta.
// W Chrome i Edge plik zapisuje się na dysk na bieżąco, więc działa też przy dużych sesjach.
export default function DownloadAll({ items, zipName }: { items: Item[]; zipName: string }) {
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

  async function run(kind: Kind) {
    setMenu(false);
    setState("busy");
    setCount(0);
    const name = kind === "full" ? zipName : zipName.replace(/\.zip$/, "-internet.zip");
    try {
      async function* files() {
        for (const it of items) {
          const url = kind === "full" ? it.url : it.webUrl;
          const fileName = kind === "full" ? it.fileName : it.webFileName;
          const res = await fetch(url);
          if (!res.ok) throw new Error(`Nie udało się pobrać ${fileName}`);
          yield { name: fileName, input: res };
          setCount((c) => c + 1);
        }
      }

      const zip = downloadZip(files());
      const w = window as SaveWindow;

      if (w.showSaveFilePicker && zip.body) {
        const handle = await w.showSaveFilePicker({
          suggestedName: name,
          types: [{ description: "Archiwum ZIP", accept: { "application/zip": [".zip"] } }],
        });
        const writable = await handle.createWritable();
        await zip.body.pipeTo(writable);
      } else {
        const blob = await zip.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
      }
      setState("done");
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setState("idle");
        return;
      }
      setState("error");
    }
  }

  return (
    <div className="download-all" ref={ref}>
      <button
        className="btn btn-ghost"
        type="button"
        onClick={() => setMenu((v) => !v)}
        disabled={state === "busy"}
        aria-haspopup="menu"
        aria-expanded={menu}
      >
        {state === "busy" ? `Przygotowuję… ${count} z ${items.length}` : "Pobierz wszystkie"}
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
