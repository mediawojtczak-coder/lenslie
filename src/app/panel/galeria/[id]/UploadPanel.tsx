"use client";

import { useState } from "react";
import type { FileState } from "@/lib/upload-client";

export type QueueItem = { name: string; state: FileState };

const LABEL: Record<FileState["status"], string> = {
  queued: "W kolejce",
  preparing: "Przygotowuję…",
  uploading: "",
  done: "Gotowe",
  error: "Błąd",
  canceled: "Anulowano",
};

const ORDER: Record<FileState["status"], number> = {
  uploading: 0,
  preparing: 1,
  queued: 2,
  error: 3,
  canceled: 4,
  done: 5,
};

// Okno przesyłania w prawym dolnym rogu: lista plików z postępem, anulowanie, zwijanie
export default function UploadPanel({
  items,
  onCancel,
  onCancelAll,
  onClose,
}: {
  items: QueueItem[];
  onCancel: (index: number) => void;
  onCancelAll: () => void;
  onClose: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const total = items.length;
  const done = items.filter((i) => i.state.status === "done").length;
  const failed = items.filter((i) => i.state.status === "error").length;
  const active = items.some((i) => ["queued", "preparing", "uploading"].includes(i.state.status));
  const overall = total ? items.reduce((s, i) => s + (i.state.status === "done" ? 1 : i.state.progress), 0) / total : 0;

  // Najpierw pliki w trakcie, potem kolejka, błędy; gotowe na końcu
  const sorted = items.map((it, index) => ({ ...it, index })).sort((a, b) => ORDER[a.state.status] - ORDER[b.state.status] || a.index - b.index);
  const shown = sorted.slice(0, 5);
  const rest = total - shown.length;

  return (
    <aside className={collapsed ? "upload-panel collapsed" : "upload-panel"} aria-live="polite" aria-label="Przesyłanie plików">
      <header className="up-head">
        <div>
          <h2>{active ? "Przesyłanie plików" : failed ? "Przesyłanie zakończone z błędami" : "Przesłano wszystkie zdjęcia"}</h2>
          <p>
            {done} z {total}
            {failed > 0 && ` · błędy: ${failed}`}
          </p>
        </div>
        <button
          type="button"
          className="up-icon"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Rozwiń" : "Zwiń"}
          title={collapsed ? "Rozwiń" : "Zwiń"}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d={collapsed ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {!active && (
          <button type="button" className="up-icon" onClick={onClose} aria-label="Zamknij" title="Zamknij">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </header>
      <div className="up-total">
        <span style={{ width: `${Math.round(overall * 100)}%` }} />
      </div>

      {!collapsed && (
        <>
          <ul className="up-list">
            {shown.map((it) => {
              const s = it.state;
              const canCancel = s.status === "queued" || s.status === "preparing" || s.status === "uploading";
              return (
                <li key={it.index} className={`up-row ${s.status}`}>
                  <div className="up-line">
                    <span className="up-name" title={it.name}>
                      {it.name}
                    </span>
                    <span className="up-status" title={s.error}>
                      {s.status === "uploading" ? `${Math.round(s.progress * 100)}%` : LABEL[s.status]}
                    </span>
                    {canCancel ? (
                      <button type="button" className="up-x" onClick={() => onCancel(it.index)} aria-label={`Anuluj ${it.name}`} title="Anuluj">
                        <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
                          <path d="M7 7l10 10M17 7 7 17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      </button>
                    ) : s.status === "done" ? (
                      <span className="up-ok" aria-hidden="true">
                        <svg viewBox="0 0 24 24" width="14" height="14">
                          <path d="M6 12.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    ) : (
                      <span className="up-x-placeholder" />
                    )}
                  </div>
                  <div className="up-bar">
                    <span style={{ width: `${Math.round((s.status === "done" ? 1 : s.progress) * 100)}%` }} />
                  </div>
                  {s.status === "error" && s.error && <p className="up-err">{s.error}</p>}
                </li>
              );
            })}
          </ul>
          <footer className="up-foot">
            <span>{rest > 0 ? `i ${rest} ${rest === 1 ? "pozostałe zdjęcie" : "pozostałych zdjęć"}` : ""}</span>
            {active ? (
              <button type="button" className="btn btn-ghost btn-small" onClick={onCancelAll}>
                Anuluj przesyłanie
              </button>
            ) : (
              <button type="button" className="btn btn-ghost btn-small" onClick={onClose}>
                Zamknij
              </button>
            )}
          </footer>
        </>
      )}
    </aside>
  );
}
