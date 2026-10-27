"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadPhotos } from "@/lib/upload-client";
import Lightbox from "@/components/Lightbox";

type Item = { name: string; fileName: string; url: string; size: number; uploadedAt: string };
type Sort = "nazwa-asc" | "nazwa-desc" | "nowe" | "stare";

function formatSize(bytes: number) {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(mb >= 10 ? 0 : 1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function PhotoManager({
  id,
  layout: initialLayout,
  photos,
}: {
  id: string;
  layout: "mozaika" | "siatka";
  photos: Item[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [layout, setLayout] = useState(initialLayout);
  const [sort, setSort] = useState<Sort>("nazwa-asc");
  const [query, setQuery] = useState("");
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [viewer, setViewer] = useState<number | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = photos.filter((p) => !q || p.fileName.toLowerCase().includes(q));
    const byName = (a: Item, b: Item) => a.fileName.localeCompare(b.fileName, "pl", { numeric: true });
    switch (sort) {
      case "nazwa-desc":
        return [...list].sort((a, b) => byName(b, a));
      case "nowe":
        return [...list].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
      case "stare":
        return [...list].sort((a, b) => a.uploadedAt.localeCompare(b.uploadedAt));
      default:
        return [...list].sort(byName);
    }
  }, [photos, sort, query]);

  async function changeLayout(next: "mozaika" | "siatka") {
    setLayout(next);
    await fetch("/api/galleries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gallery: id, layout: next }),
    });
  }

  async function startUpload(list: FileList | File[] | null) {
    const files = Array.from(list ?? []).filter((f) => /^image\/(jpeg|png|webp)$/.test(f.type));
    if (files.length === 0) {
      setError("Wybierz zdjęcia w formacie JPG, PNG lub WebP.");
      return;
    }
    setError("");
    setUploading({ done: 0, total: files.length });
    try {
      await uploadPhotos(id, files, (done) => setUploading({ done, total: files.length }));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się przesłać zdjęć.");
    } finally {
      setUploading(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function remove(item: Item) {
    if (!window.confirm(`Usunąć zdjęcie ${item.fileName}? Tej operacji nie można cofnąć.`)) return;
    setDeleting(item.name);
    setError("");
    try {
      const res = await fetch(`/api/galleries/${id}/photos`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ names: [item.name] }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Nie udało się usunąć zdjęcia.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się usunąć zdjęcia.");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <section
      className={dragOver ? "manager drag" : "manager"}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (!uploading) startUpload(e.dataTransfer.files);
      }}
    >
      <div className="toolbar">
        <input
          className="tool-search"
          type="search"
          placeholder="Szukaj po nazwie pliku"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Szukaj zdjęć"
        />
        <div className="tool-right">
          <label className="tool-select">
            <span className="sr-only">Układ zdjęć</span>
            <select value={layout} onChange={(e) => changeLayout(e.target.value as "mozaika" | "siatka")}>
              <option value="mozaika">Układ: mozaika</option>
              <option value="siatka">Układ: siatka</option>
            </select>
          </label>
          <label className="tool-select">
            <span className="sr-only">Sortowanie</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="nazwa-asc">Nazwa (A–Z)</option>
              <option value="nazwa-desc">Nazwa (Z–A)</option>
              <option value="nowe">Najnowsze</option>
              <option value="stare">Najstarsze</option>
            </select>
          </label>
          <button
            type="button"
            className="btn btn-small"
            onClick={() => fileRef.current?.click()}
            disabled={Boolean(uploading)}
          >
            {uploading ? `Przesyłam ${uploading.done} z ${uploading.total}` : "Prześlij zdjęcia"}
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={(e) => startUpload(e.target.files)}
          />
        </div>
      </div>

      {uploading && (
        <div className="progress" aria-live="polite">
          <div className="bar" style={{ width: `${(uploading.done / uploading.total) * 100}%` }} />
        </div>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {photos.length === 0 ? (
        <button type="button" className="dropzone" onClick={() => fileRef.current?.click()} disabled={Boolean(uploading)}>
          <span className="dropzone-title">Przeciągnij tutaj zdjęcia z sesji</span>
          <span className="dropzone-note">albo kliknij, aby wybrać pliki (JPG, PNG, WebP)</span>
        </button>
      ) : (
        <ul className="photo-grid">
          {visible.map((p, i) => (
            <li key={p.name} className={deleting === p.name ? "p-tile busy" : "p-tile"}>
              <button type="button" className="p-img" onClick={() => setViewer(i)} aria-label={`Powiększ ${p.fileName}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.fileName} loading="lazy" />
              </button>
              <div className="p-info">
                <div>
                  <p className="p-name">{p.fileName}</p>
                  <p className="p-size">{formatSize(p.size)}</p>
                </div>
                <button
                  type="button"
                  className="p-del"
                  onClick={() => remove(p)}
                  disabled={deleting === p.name}
                  aria-label={`Usuń ${p.fileName}`}
                  title="Usuń zdjęcie"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <path
                      d="M9 3h6m-9 4h12m-1 0-.7 11.2A2 2 0 0 1 14.3 20H9.7a2 2 0 0 1-2-1.8L7 7m3 4v5m4-5v5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {photos.length > 0 && visible.length === 0 && <p className="notice-left">Brak zdjęć o takiej nazwie.</p>}

      {viewer !== null && visible[viewer] && (
        <Lightbox
          items={visible.map((p) => ({ url: p.url, name: p.fileName }))}
          index={viewer}
          onIndex={setViewer}
          onClose={() => setViewer(null)}
        />
      )}
    </section>
  );
}
