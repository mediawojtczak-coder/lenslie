"use client";

import { useTr } from "@/components/LangProvider";
import { useState } from "react";
import { useRouter } from "next/navigation";

// Kopiowanie nazw plików (np. do Lightrooma), pobranie listy i usunięcie wyboru
export default function SelectionActions({
  galleryId,
  selectionId,
  name,
  fileNames,
}: {
  galleryId: string;
  selectionId: string;
  name: string;
  fileNames: string[];
}) {
  const router = useRouter();
  const t = useTr();
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(fileNames.join(", "));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function download() {
    const blob = new Blob([fileNames.join("\n") + "\n"], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `wybor-${name.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}.txt`;
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
