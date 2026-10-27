"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadPhotos, type UploadJob } from "@/lib/upload-client";
import UploadPanel, { type QueueItem } from "./UploadPanel";
import Lightbox from "@/components/Lightbox";
import { useLang } from "@/components/LangProvider";
import { tr } from "@/lib/lang";

type Item = { name: string; fileName: string; url: string; size: number; uploadedAt: string; section: string | null };
type Section = { id: string; name: string };
type Sort = "wlasna" | "nazwa-asc" | "nazwa-desc" | "nowe" | "stare";
// "" = wszystkie, "-" = bez sekcji, inaczej id sekcji
type Filter = string;

function formatSize(bytes: number) {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(mb >= 10 ? 0 : 1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function PhotoManager({
  id,
  layout: initialLayout,
  cover: initialCover,
  photos,
  sections,
}: {
  id: string;
  layout: "mozaika" | "siatka";
  cover: string | null;
  photos: Item[];
  sections: Section[];
}) {
  const router = useRouter();
  const lang = useLang();
  const t = (pl: string, en: string) => tr(lang, pl, en);
  const fileRef = useRef<HTMLInputElement>(null);
  const [layout, setLayout] = useState(initialLayout);
  const [sort, setSort] = useState<Sort>("wlasna");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("");
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
  const [queue, setQueue] = useState<QueueItem[] | null>(null);
  const jobRef = useRef<UploadJob | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [viewer, setViewer] = useState<number | null>(null);
  const [cover, setCover] = useState(initialCover);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [items, setItems] = useState(photos);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  // Po odświeżeniu danych z serwera bierzemy aktualną listę
  useEffect(() => {
    setItems(photos);
    setSelected((prev) => new Set([...prev].filter((n) => photos.some((p) => p.name === n))));
  }, [photos]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { "": items.length, "-": 0 };
    for (const p of items) {
      if (p.section && sections.some((s) => s.id === p.section)) c[p.section] = (c[p.section] ?? 0) + 1;
      else c["-"]++;
    }
    return c;
  }, [items, sections]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const known = new Set(sections.map((s) => s.id));
    const list = items.filter((p) => {
      if (q && !p.fileName.toLowerCase().includes(q)) return false;
      if (filter === "-") return !p.section || !known.has(p.section);
      if (filter) return p.section === filter;
      return true;
    });
    const byName = (a: Item, b: Item) => a.fileName.localeCompare(b.fileName, "pl", { numeric: true });
    switch (sort) {
      case "nazwa-asc":
        return [...list].sort(byName);
      case "nazwa-desc":
        return [...list].sort((a, b) => byName(b, a));
      case "nowe":
        return [...list].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
      case "stare":
        return [...list].sort((a, b) => a.uploadedAt.localeCompare(b.uploadedAt));
      default:
        return list;
    }
  }, [items, sort, query, filter, sections]);

  const canDrag = sort === "wlasna" && !query.trim();

  async function api(path: string, body: unknown, method = "POST") {
    const res = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? t("Coś poszło nie tak. Spróbuj ponownie.", "Something went wrong. Please try again."));
    return data;
  }

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Coś poszło nie tak. Spróbuj ponownie.", "Something went wrong. Please try again."));
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

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
    if (fileRef.current) fileRef.current.value = "";
    if (files.length === 0) {
      setError(t("Wybierz zdjęcia w formacie JPG, PNG lub WebP.", "Choose photos in JPG, PNG or WebP format."));
      return;
    }
    if (jobRef.current) return;
    setError("");
    setQueue(files.map((f) => ({ name: f.name, state: { status: "queued", progress: 0 } })));
    setUploading({ done: 0, total: files.length });

    let finished = 0;
    const job = uploadPhotos(id, files, (index, state) => {
      setQueue((q) => (q ? q.map((it, i) => (i === index ? { ...it, state } : it)) : q));
      if (state.status === "done") {
        finished += 1;
        setUploading({ done: finished, total: files.length });
        // Co 10 zdjęć odświeżamy siatkę, żeby nowe zdjęcia pojawiały się na bieżąco
        if (finished % 10 === 0) router.refresh();
      }
    });
    jobRef.current = job;
    try {
      await job.done;
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Nie udało się przesłać zdjęć.", "Could not upload the photos."));
      const code = (err as { code?: string }).code;
      if (code === "LIMIT" || code === "NO_PLAN" || code === "EXPIRED") {
        window.dispatchEvent(new Event("lenslie:plan"));
      }
    } finally {
      jobRef.current = null;
      setUploading(null);
      // Pliki, które nie zdążyły ruszyć (np. po anulowaniu całości), oznaczamy jako anulowane
      setQueue((q) =>
        q
          ? q.map((it) =>
              ["queued", "preparing", "uploading"].includes(it.state.status)
                ? { ...it, state: { status: "canceled", progress: 0 } }
                : it,
            )
          : q,
      );
      router.refresh();
    }
  }

  // Nie pozwalamy przypadkiem zamknąć karty w trakcie przesyłania
  useEffect(() => {
    if (!uploading) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [uploading]);

  function chooseCover(item: Item) {
    setCover(item.name);
    run(() => api(`/api/galleries/${id}/cover`, { name: item.name }));
  }

  function removeNames(names: string[]) {
    const label = names.length === 1 ? t("to zdjęcie", "this photo") : `${names.length} ${t("zdjęć", "photos")}`;
    if (!window.confirm(`${t("Usunąć", "Delete")} ${label}? ${t("Tej operacji nie można cofnąć.", "This cannot be undone.")}`)) return;
    setItems((list) => list.filter((p) => !names.includes(p.name)));
    setSelected(new Set());
    run(() => api(`/api/galleries/${id}/photos`, { names }, "DELETE"));
  }

  function assign(section: string | null) {
    const names = [...selected];
    setItems((list) => list.map((p) => (selected.has(p.name) ? { ...p, section } : p)));
    setSelected(new Set());
    run(() => api(`/api/galleries/${id}/organize`, { action: "assign", names, section }));
  }

  function saveOrder(next: Item[]) {
    setItems(next);
    run(() => api(`/api/galleries/${id}/organize`, { action: "order", order: next.map((p) => p.name) }));
  }

  function moveToStart() {
    const chosen = items.filter((p) => selected.has(p.name));
    setSelected(new Set());
    setSort("wlasna");
    saveOrder([...chosen, ...items.filter((p) => !selected.has(p.name))]);
  }

  // Przeciąganie: przenosi zdjęcie (albo wszystkie zaznaczone) przed wskazane zdjęcie
  function dropOn(targetName: string) {
    const src = dragging;
    setDragging(null);
    setDropTarget(null);
    if (!src || src === targetName) return;
    const moving = selected.has(src) ? items.filter((p) => selected.has(p.name)) : items.filter((p) => p.name === src);
    if (moving.some((p) => p.name === targetName)) return;
    const rest = items.filter((p) => !moving.includes(p));
    const at = rest.findIndex((p) => p.name === targetName);
    const srcIndex = items.findIndex((p) => p.name === src);
    const targetIndex = items.findIndex((p) => p.name === targetName);
    // Przeciągając w prawo, wstawiamy za wskazane zdjęcie
    const insert = srcIndex < targetIndex ? at + 1 : at;
    saveOrder([...rest.slice(0, insert), ...moving, ...rest.slice(insert)]);
  }

  function toggle(name: string, e?: React.MouseEvent) {
    setSelected((prev) => {
      const next = new Set(prev);
      // Shift: zaznacz zakres od ostatnio zaznaczonego
      if (e?.shiftKey && prev.size > 0) {
        const names = visible.map((p) => p.name);
        const last = names.findIndex((n) => prev.has(n));
        const cur = names.indexOf(name);
        const [a, b] = last < cur ? [last, cur] : [cur, last];
        names.slice(a, b + 1).forEach((n) => next.add(n));
        return next;
      }
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  // Sekcje
  function addSection() {
    const name = window.prompt(t("Nazwa nowej sekcji, np. Przygotowania, Ceremonia, Wesele", "New section name, e.g. Getting ready, Ceremony, Reception"));
    if (!name?.trim()) return;
    run(async () => {
      const data = await api(`/api/galleries/${id}/organize`, { action: "add-section", name });
      if (data.section) setFilter(data.section.id);
    });
  }

  function renameSection(s: Section) {
    const name = window.prompt(t("Nowa nazwa sekcji", "New section name"), s.name);
    if (!name?.trim() || name.trim() === s.name) return;
    run(() => api(`/api/galleries/${id}/organize`, { action: "rename-section", section: s.id, name }));
  }

  function deleteSection(s: Section) {
    if (!window.confirm(t(`Usunąć sekcję „${s.name}”? Zdjęcia zostaną w galerii, tylko bez sekcji.`, `Delete section “${s.name}”? The photos stay in the gallery, just without a section.`))) return;
    setFilter("");
    run(() => api(`/api/galleries/${id}/organize`, { action: "delete-section", section: s.id }));
  }

  function moveSection(s: Section, dir: number) {
    run(() => api(`/api/galleries/${id}/organize`, { action: "move-section", section: s.id, dir }));
  }

  const activeSection = sections.find((s) => s.id === filter);

  return (
    <section
      className={dragOver ? "manager drag" : "manager"}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDragOver(false);
        if (!uploading) startUpload(e.dataTransfer.files);
      }}
    >
      <div className="toolbar">
        <input
          className="tool-search"
          type="search"
          placeholder={t("Szukaj po nazwie pliku", "Search by file name")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={t("Szukaj zdjęć", "Search photos")}
        />
        <div className="tool-right">
          <label className="tool-select">
            <span className="sr-only">{t("Układ zdjęć", "Photo layout")}</span>
            <select value={layout} onChange={(e) => changeLayout(e.target.value as "mozaika" | "siatka")}>
              <option value="mozaika">{t("Układ: mozaika", "Layout: mosaic")}</option>
              <option value="siatka">{t("Układ: siatka", "Layout: grid")}</option>
            </select>
          </label>
          <label className="tool-select">
            <span className="sr-only">Sortowanie</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="wlasna">{t("Własna kolejność", "Custom order")}</option>
              <option value="nazwa-asc">{t("Nazwa (A–Z)", "Name (A–Z)")}</option>
              <option value="nazwa-desc">{t("Nazwa (Z–A)", "Name (Z–A)")}</option>
              <option value="nowe">{t("Najnowsze", "Newest")}</option>
              <option value="stare">{t("Najstarsze", "Oldest")}</option>
            </select>
          </label>
          <button
            type="button"
            className="btn btn-small"
            onClick={() => fileRef.current?.click()}
            disabled={Boolean(uploading)}
          >
            {uploading ? `${t("Przesyłam", "Uploading")} ${uploading.done} ${t("z", "of")} ${uploading.total}` : t("Prześlij zdjęcia", "Upload photos")}
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

      <div className="sections-bar">
        <div className="chips" role="tablist" aria-label={t("Sekcje", "Sections")}>
          <button type="button" className={filter === "" ? "chip active" : "chip"} onClick={() => setFilter("")}>
            {t("Wszystkie", "All")} <span>{counts[""]}</span>
          </button>
          {sections.map((s) => (
            <button
              key={s.id}
              type="button"
              className={filter === s.id ? "chip active" : "chip"}
              onClick={() => setFilter(s.id)}
            >
              {s.name} <span>{counts[s.id] ?? 0}</span>
            </button>
          ))}
          {sections.length > 0 && (
            <button type="button" className={filter === "-" ? "chip active" : "chip"} onClick={() => setFilter("-")}>
              {t("Bez sekcji", "No section")} <span>{counts["-"]}</span>
            </button>
          )}
          <button type="button" className="chip chip-add" onClick={addSection} disabled={busy}>
            {t("+ Sekcja", "+ Section")}
          </button>
        </div>
        {activeSection && (
          <div className="section-tools">
            <button type="button" className="as-link" onClick={() => moveSection(activeSection, -1)} disabled={busy}>
              ← {t("Wcześniej", "Earlier")}
            </button>
            <button type="button" className="as-link" onClick={() => moveSection(activeSection, 1)} disabled={busy}>
              {t("Później", "Later")} →
            </button>
            <button type="button" className="as-link" onClick={() => renameSection(activeSection)} disabled={busy}>
              {t("Zmień nazwę", "Rename")}
            </button>
            <button type="button" className="as-link danger" onClick={() => deleteSection(activeSection)} disabled={busy}>
              {t("Usuń sekcję", "Delete section")}
            </button>
          </div>
        )}
      </div>

      {selected.size > 0 && (
        <div className="select-bar" role="region" aria-label={t("Zaznaczone zdjęcia", "Selected photos")}>
          <p>
            {t("Zaznaczono", "Selected")} <strong>{selected.size}</strong>
          </p>
          <div className="select-actions">
            <button type="button" className="as-link" onClick={() => setSelected(new Set(visible.map((p) => p.name)))}>
              {t("Zaznacz wszystkie", "Select all")} ({visible.length})
            </button>
            {sections.length > 0 && (
              <label className="tool-select">
                <span className="sr-only">{t("Przenieś do sekcji", "Move to section")}</span>
                <select
                  value=""
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v) assign(v === "-" ? null : v);
                  }}
                  disabled={busy}
                >
                  <option value="">{t("Przenieś do sekcji…", "Move to section…")}</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                  <option value="-">{t("Bez sekcji", "No section")}</option>
                </select>
              </label>
            )}
            <button type="button" className="btn btn-ghost btn-small" onClick={moveToStart} disabled={busy}>
              {t("Na początek", "Move to start")}
            </button>
            <button type="button" className="btn btn-small btn-danger" onClick={() => removeNames([...selected])} disabled={busy}>
              {t("Usuń", "Delete")}
            </button>
            <button type="button" className="as-link" onClick={() => setSelected(new Set())}>
              {t("Anuluj", "Cancel")}
            </button>
          </div>
        </div>
      )}

      {queue && (
        <UploadPanel
          items={queue}
          onCancel={(i) => jobRef.current?.cancel(i)}
          onCancelAll={() => {
            if (window.confirm(t("Przerwać przesyłanie? Zdjęcia już przesłane zostaną w galerii.", "Stop uploading? Photos already uploaded stay in the gallery."))) jobRef.current?.cancel();
          }}
          onClose={() => setQueue(null)}
        />
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {canDrag && items.length > 1 && selected.size === 0 && (
        <p className="hint-inline">{t("Przeciągnij zdjęcie, aby zmienić kolejność. Gwiazdka ustawia okładkę galerii.", "Drag a photo to change the order. The star sets the gallery cover.")}</p>
      )}

      {items.length === 0 ? (
        <button type="button" className="dropzone" onClick={() => fileRef.current?.click()} disabled={Boolean(uploading)}>
          <span className="dropzone-title">{t("Przeciągnij tutaj zdjęcia z sesji", "Drag your session photos here")}</span>
          <span className="dropzone-note">{t("albo kliknij, aby wybrać pliki (JPG, PNG, WebP)", "or click to choose files (JPG, PNG, WebP)")}</span>
        </button>
      ) : (
        <ul className={selected.size > 0 ? "photo-grid selecting" : "photo-grid"}>
          {visible.map((p, i) => {
            const isSel = selected.has(p.name);
            const cls = ["p-tile", isSel && "selected", dragging === p.name && "dragging", dropTarget === p.name && "drop-target"]
              .filter(Boolean)
              .join(" ");
            return (
              <li
                key={p.name}
                className={cls}
                draggable={canDrag}
                onDragStart={(e) => {
                  setDragging(p.name);
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", p.name);
                }}
                onDragEnd={() => {
                  setDragging(null);
                  setDropTarget(null);
                }}
                onDragOver={(e) => {
                  if (!dragging) return;
                  e.preventDefault();
                  if (dropTarget !== p.name) setDropTarget(p.name);
                }}
                onDrop={(e) => {
                  if (!dragging) return;
                  e.preventDefault();
                  e.stopPropagation();
                  dropOn(p.name);
                }}
              >
                <button
                  type="button"
                  className="p-img"
                  onClick={(e) => (selected.size > 0 ? toggle(p.name, e) : setViewer(i))}
                  aria-label={`${selected.size > 0 ? t("Zaznacz", "Select") : t("Powiększ", "Enlarge")} ${p.fileName}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={p.fileName} loading="lazy" draggable={false} />
                </button>
                <label className="p-check" title={t("Zaznacz", "Select")}>
                  <input
                    type="checkbox"
                    checked={isSel}
                    onChange={() => undefined}
                    onClick={(e) => toggle(p.name, e)}
                    aria-label={`${t("Zaznacz", "Select")} ${p.fileName}`}
                  />
                  <span aria-hidden="true" />
                </label>
                {cover === p.name && <span className="p-cover-badge">{t("Okładka", "Cover")}</span>}
                <div className="p-info">
                  <div>
                    <p className="p-name">{p.fileName}</p>
                    <p className="p-size">
                      {formatSize(p.size)}
                      {!filter && p.section && sections.find((s) => s.id === p.section) && (
                        <> · {sections.find((s) => s.id === p.section)?.name}</>
                      )}
                    </p>
                  </div>
                  <div className="p-btns">
                    <button
                      type="button"
                      className={cover === p.name ? "p-star active" : "p-star"}
                      onClick={() => cover !== p.name && chooseCover(p)}
                      disabled={busy}
                      aria-pressed={cover === p.name}
                      aria-label={cover === p.name ? `${p.fileName}: ${t("okładka", "cover")}` : `${t("Ustaw jako okładkę", "Set as cover")}: ${p.fileName}`}
                      title={cover === p.name ? t("To zdjęcie jest okładką", "This photo is the cover") : t("Ustaw jako okładkę", "Set as cover")}
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                        <path
                          d="m12 3.8 2.5 5.1 5.6.8-4 4 .9 5.6-5-2.7-5 2.7.9-5.6-4-4 5.6-.8z"
                          fill={cover === p.name ? "currentColor" : "none"}
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="p-del"
                      onClick={() => removeNames([p.name])}
                      disabled={busy}
                      aria-label={`${t("Usuń", "Delete")} ${p.fileName}`}
                      title={t("Usuń zdjęcie", "Delete photo")}
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
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {items.length > 0 && visible.length === 0 && <p className="notice-left">{t("Brak zdjęć w tym widoku.", "No photos in this view.")}</p>}

      {viewer !== null && visible[viewer] && (
        <Lightbox
          items={visible.map((p) => ({ url: p.url, name: p.fileName }))}
          index={viewer}
          onIndex={setViewer}
          onClose={() => setViewer(null)}
          lang={lang}
        />
      )}
    </section>
  );
}
