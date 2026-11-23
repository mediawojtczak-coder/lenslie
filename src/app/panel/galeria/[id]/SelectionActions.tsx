"use client";

import { useTr } from "@/components/LangProvider";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveZip } from "@/lib/zip-client";

// Kopiowanie nazw plików (np. do Lightrooma), pobranie listy i usunięcie wyboru
export default function SelectionActions({
  galleryId,
  selectionId,
  name,
  fileNames,
  files = [],
}: {
  galleryId: string;
  selectionId: string;
  name: string;
  fileNames: string[];
  files?: { url: string; fileName: string }[];
}) {
  const router = useRouter();
  const t = useTr();
  const [copied, setCopied] = useState(false);
  const [zip, setZip] = useState<{ done: number } | null>(null);
  const [zipError, setZipError] = useState(false);
  const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ł/g, "l").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "klient";

  // Wybrane zdjęcia w pełnej rozdzielczości (już podmienione na obrobione, jeśli były) jako jeden ZIP
  async function downloadPhotos() {
    if (zip || files.length === 0) return;
    setZipError(false);
    setZip({ done: 0 });
    try {
      await saveZip(
        files.map((f) => ({ url: f.url, fileName: f.fileName, webUrl: f.url, webFileName: f.fileName })),
        `wybor-${slug}.zip`,
        "full",
        () => setZip((z) => (z ? { done: z.done + 1 } : z)),
      );
    } catch {
      setZipError(true);
    } finally {
      setZip(null);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(fileNames.join(", "));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function download() {
    const blob = new Blob([fileNames.join("\n") + "\n"], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `wybor-${slug}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  async function remove() {
    if (!window.confirm(t(`Usunąć wybór klienta ${name}?`, `Delete the selection of ${name}?`))) return;
    await fetch(`/api/galleries/${galleryId}/selections`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selection: selectionId }),
    });
    router.refresh();
  }

  return (
    <div className="selection-actions">
      <button type="button" className="btn btn-dark btn-small" onClick={downloadPhotos} disabled={files.length === 0 || Boolean(zip)}>
        {zip
          ? `${t("Pobieranie", "Downloading")} ${zip.done} / ${files.length}`
          : `${t("Pobierz zdjęcia", "Download photos")} (${files.length})`}
      </button>
      {zipError && <span className="sel-zip-err">{t("Nie udało się pobrać – spróbuj ponownie", "Download failed – try again")}</span>}
      <button type="button" className="btn btn-ghost btn-small" onClick={copy} disabled={fileNames.length === 0}>
        {copied ? t("Skopiowano", "Copied") : t("Kopiuj nazwy plików", "Copy file names")}
      </button>
      <button type="button" className="as-link" onClick={download} disabled={fileNames.length === 0}>
        {t("Pobierz listę", "Download list")}
      </button>
      <button type="button" className="as-link danger" onClick={remove}>
        {t("Usuń", "Delete")}
      </button>
    </div>
  );
}
