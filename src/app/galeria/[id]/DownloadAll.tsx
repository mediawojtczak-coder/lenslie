"use client";

import { useState } from "react";
import { downloadZip } from "client-zip";

type Item = { url: string; fileName: string };

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

  async function run() {
    setState("busy");
    setCount(0);
    try {
      async function* files() {
        for (const it of items) {
          const res = await fetch(it.url);
          if (!res.ok) throw new Error(`Nie udało się pobrać ${it.fileName}`);
          yield { name: it.fileName, input: res };
          setCount((c) => c + 1);
        }
      }

      const zip = downloadZip(files());
      const w = window as SaveWindow;

      if (w.showSaveFilePicker && zip.body) {
        const handle = await w.showSaveFilePicker({
          suggestedName: zipName,
          types: [{ description: "Archiwum ZIP", accept: { "application/zip": [".zip"] } }],
        });
        const writable = await handle.createWritable();
        await zip.body.pipeTo(writable);
      } else {
        const blob = await zip.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = zipName;
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
    <div className="download-all">
      <button className="btn btn-ghost" type="button" onClick={run} disabled={state === "busy"}>
        {state === "busy"
          ? `Przygotowuję… ${count} z ${items.length}`
          : `Pobierz wszystkie zdjęcia (${items.length})`}
      </button>
      {state === "done" && <p className="hint-center">Pobieranie zakończone.</p>}
      {state === "error" && (
        <p className="error hint-center" role="alert">
          Nie udało się pobrać wszystkich zdjęć. Odśwież stronę i spróbuj ponownie.
        </p>
      )}
    </div>
  );
}
