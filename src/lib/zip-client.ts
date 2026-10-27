import { downloadZip } from "client-zip";

export type ZipItem = { url: string; fileName: string; webUrl: string; webFileName: string };
export type ZipKind = "full" | "web";

type SaveWindow = Window & {
  showSaveFilePicker?: (options: {
    suggestedName?: string;
    types?: { description: string; accept: Record<string, string[]> }[];
  }) => Promise<{ createWritable: () => Promise<WritableStream<Uint8Array>> }>;
};

// Składa ZIP bezpośrednio w przeglądarce klienta.
// W Chrome i Edge plik zapisuje się na dysk na bieżąco, więc działa też przy dużych sesjach.
// Zwraca false, gdy użytkownik anulował zapis.
export async function saveZip(items: ZipItem[], zipName: string, kind: ZipKind, onFile: () => void) {
  const name = kind === "full" ? zipName : zipName.replace(/\.zip$/, "-internet.zip");

  async function* files() {
    for (const it of items) {
      const url = kind === "full" ? it.url : it.webUrl;
      const fileName = kind === "full" ? it.fileName : it.webFileName;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Nie udało się pobrać ${fileName}`);
      yield { name: fileName, input: res };
      onFile();
    }
  }

  const w = window as SaveWindow;
  try {
    if (w.showSaveFilePicker) {
      const handle = await w.showSaveFilePicker({
        suggestedName: name,
        types: [{ description: "Archiwum ZIP", accept: { "application/zip": [".zip"] } }],
      });
      const zip = downloadZip(files());
      const writable = await handle.createWritable();
      await zip.body!.pipeTo(writable);
    } else {
      const blob = await downloadZip(files()).blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") return false;
    throw err;
  }
  return true;
}
