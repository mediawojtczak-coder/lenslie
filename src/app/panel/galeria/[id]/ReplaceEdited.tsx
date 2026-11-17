"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTr } from "@/components/LangProvider";
import { uploadPhotos, type FileState } from "@/lib/upload-client";

type Photo = { name: string; fileName: string };

// Nazwa bez rozszerzenia i typowych dopisków programów do obróbki („-Edit”, „-edytowane”, „ kopia”, „-2”)
function norm(file: string) {
  let n = file.replace(/\.[^.]+$/, "").toLowerCase().trim();
  for (let i = 0; i < 3; i++) {
    n = n
      .replace(/[\s_-]*(edit(ed)?|edytowan[ey]|retusz|final|gotowe|kopia|copy|lr|ps)(\s*\(?\d+\)?)?$/i, "")
      .replace(/[\s_-]*\(\d+\)$/, "")
      .replace(/-\d$/, "")
      .trim();
  }
  return n.replace(/[^a-z0-9]+/g, "");
}
const ext = (file: string) => (/\.[a-z0-9]+$/i.exec(file)?.[0] ?? ".jpg").toLowerCase();

// Podmiana wybranych przez klienta zdjęć na obrobione: fotograf wrzuca gotowe pliki,
// a Lenslie dopasowuje je po nazwie do zdjęć z wyboru (DSC0123.jpg ↔ DSC0123-Edit.jpg)
export default function ReplaceEdited({ galleryId, photos, edited }: { galleryId: string; photos: Photo[]; edited: string[] }) {
  const t = useTr();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [plan, setPlan] = useState<{ file: File; photo: Photo }[] | null>(null);
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const [states, setStates] = useState<FileState[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const done = photos.filter((p) => edited.includes(p.name)).length;

  function pick(list: FileList | null) {
    if (!list?.length) return;
    const byNorm = new Map(photos.map((p) => [norm(p.fileName), p]));
    const matched = new Map<string, { file: File; photo: Photo }>();
    const miss: string[] = [];
    for (const f of Array.from(list)) {
      if (!/^image\/(jpeg|png|webp)$/.test(f.type)) {
        miss.push(f.name);
        continue;
      }
      const p = byNorm.get(norm(f.name));
      if (p) matched.set(p.name, { file: f, photo: p });
      else miss.push(f.name);
    }
    setPlan([...matched.values()]);
    setUnmatched(miss);
    setStates([]);
    setError("");
  }

  async function start() {
    if (!plan?.length) return;
    setBusy(true);
    setError("");
    // plik dostaje nazwę podmienianego zdjęcia – wtedy trafia dokładnie w jego miejsce
    const files = plan.map(({ file, photo }) => new File([file], `${photo.name}${ext(file.name)}`, { type: file.type }));
    const st: FileState[] = files.map(() => ({ status: "queued", progress: 0 }));
    setStates([...st]);
    const job = uploadPhotos(
      galleryId,
      files,
      (i, s) => {
        st[i] = s;
        setStates([...st]);
      },
      `/api/galleries/${galleryId}/replace`,
    );
    try {
      await job.done;
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Coś poszło nie tak.", "Something went wrong."));
    }
    const ok = plan.filter((_, i) => st[i]?.status === "done");
    if (ok.length) {
      const kept = Object.fromEntries(ok.map(({ file, photo }) => [photo.name, `${photo.name}${ext(file.name)}`]));
      await fetch(`/api/galleries/${galleryId}/replace`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: ok.map((x) => x.photo.name), kept }),
      }).catch(() => undefined);
    }
    setBusy(false);
    if (ok.length === plan.length) {
      setPlan(null);
      setUnmatched([]);
    }
    router.refresh();
  }

  const progress = states.length ? states.reduce((s, x) => s + (x.status === "done" ? 1 : x.progress), 0) / states.length : 0;
  const failed = states.filter((s) => s.status === "error").length;

  return (
    <div className="rep">
      <div className="rep-head">
        <div>
          <b>{t("Obrobione zdjęcia", "Edited photos")}</b>
          <span>
            {done} / {photos.length} {t("podmienione", "replaced")}
          </span>
        </div>
        <button type="button" className="btn btn-small" disabled={busy || photos.length === 0} onClick={() => input.current?.click()}>
          {t("Podmień na obrobione", "Replace with edited")}
        </button>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={(e) => {
            pick(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {!plan && done < photos.length && (
        <p className="hint-inline">
          {t(
            "Wyeksportuj wybrane zdjęcia po obróbce w pełnej rozdzielczości i wskaż je tutaj – dopasujemy je po nazwie pliku. Klient pobierze obrobione wersje.",
            "Export the selected photos after editing in full resolution and pick them here – we match them by file name. Your client will download the edited versions.",
          )}
        </p>
      )}
      {plan && (
        <div className="rep-plan">
          <p>
            {plan.length > 0
              ? t(`Dopasowano ${plan.length} z ${photos.length} wybranych zdjęć.`, `Matched ${plan.length} of ${photos.length} selected photos.`)
              : t("Żaden plik nie pasuje do wybranych zdjęć.", "No file matches the selected photos.")}
            {unmatched.length > 0 && (
              <small>
                {t("Bez pary (pominięte)", "No match (skipped)")}: {unmatched.slice(0, 6).join(", ")}
                {unmatched.length > 6 ? ` +${unmatched.length - 6}` : ""}
              </small>
            )}
          </p>
          {states.length > 0 && (
            <div className="rep-bar" aria-label={t("Postęp", "Progress")}>
              <i style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
          )}
          {failed > 0 && !busy && (
            <p className="error">
              {t(`Nie udało się wgrać ${failed} plików – spróbuj ponownie.`, `${failed} files failed – try again.`)}
            </p>
          )}
          {error && <p className="error">{error}</p>}
          <div className="rep-actions">
            {plan.length > 0 && (
              <button type="button" className="btn btn-dark btn-small" disabled={busy} onClick={start}>
                {busy ? `${t("Wgrywanie", "Uploading")} ${Math.round(progress * 100)}%` : t(`Podmień ${plan.length} zdjęć`, `Replace ${plan.length} photos`)}
              </button>
            )}
            {!busy && (
              <button type="button" className="as-link" onClick={() => setPlan(null)}>
                {t("Anuluj", "Cancel")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
