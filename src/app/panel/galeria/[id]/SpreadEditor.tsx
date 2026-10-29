"use client";

import { useEffect, useRef, useState } from "react";
type RPointerEvent<T> = React.PointerEvent<T>;
import { useLang } from "@/components/LangProvider";
import { tr } from "@/lib/lang";
import { isBlurBg, type AlbumProject, type Frame, type Slot, type Spread } from "@/lib/album-layout";
import AlbumSpreadView from "./AlbumSpreadView";

type Photo = { name: string; url: string };
type Drag =
  | { kind: "move"; i: number; sx: number; sy: number; start: Frame }
  | { kind: "resize"; i: number; corner: "nw" | "ne" | "sw" | "se"; sx: number; sy: number; start: Frame }
  | { kind: "crop"; i: number; sx: number; sy: number; fx: number; fy: number };

const MIN = 0.06; // najmniejszy bok ramki (część wysokości strony)
const SNAP = 0.012;

// Swobodna edycja rozkładówki: przesuwanie i zmiana rozmiaru ramek, przesuwanie i powiększanie kadru
export default function SpreadEditor({
  spread,
  project,
  byName,
  ratio,
  onChange,
  onClose,
  onRemovePhoto,
}: {
  spread: Spread;
  project: AlbumProject;
  byName: Map<string, Photo>;
  ratio: number;
  onChange: (s: Spread) => void;
  onClose: () => void;
  onRemovePhoto: (index: number) => void;
}) {
  const lang = useLang();
  const t = (pl: string, en: string) => tr(lang, pl, en);
  const [sel, setSel] = useState<number | null>(spread.slots.length ? 0 : null);
  const [cropMode, setCropMode] = useState(false);
  const [guides, setGuides] = useState<{ x: number[]; y: number[] }>({ x: [], y: [] });
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const cur = useRef(spread);
  cur.current = spread;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const setSlot = (i: number, patch: Partial<Slot>) =>
    onChange({ ...cur.current, slots: cur.current.slots.map((s, k) => (k === i ? { ...s, ...patch } : s)) });

  // Przyciąganie do krawędzi stron, środka, grzbietu i innych zdjęć
  function snapFrame(f: Frame, i: number, moving: boolean): { f: Frame; gx: number[]; gy: number[] } {
    const xs = [0, 0.5, 1, 1.5, 2];
    const ys = [0, 0.5, 1];
    cur.current.slots.forEach((s, k) => {
      if (k === i) return;
      xs.push(s.frame.x, s.frame.x + s.frame.w);
      ys.push(s.frame.y, s.frame.y + s.frame.h);
    });
    const gx: number[] = [];
    const gy: number[] = [];
    const out = { ...f };
    const sx = SNAP / ratio; // w poziomie jednostka to szerokość strony
    if (moving) {
      for (const [edge, off] of [[out.x, 0], [out.x + out.w, out.w], [out.x + out.w / 2, out.w / 2]] as const) {
        const hit = xs.find((v) => Math.abs(v - edge) < sx);
        if (hit !== undefined) {
          out.x = hit - off;
          gx.push(hit);
          break;
        }
      }
      for (const [edge, off] of [[out.y, 0], [out.y + out.h, out.h], [out.y + out.h / 2, out.h / 2]] as const) {
        const hit = ys.find((v) => Math.abs(v - edge) < SNAP);
        if (hit !== undefined) {
          out.y = hit - off;
          gy.push(hit);
          break;
        }
      }
    }
    return { f: out, gx, gy };
  }

  function start(i: number, e: RPointerEvent<HTMLElement>) {
    e.preventDefault();
    e.stopPropagation();
    setSel(i);
    const s = cur.current.slots[i];
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    if (cropMode || e.altKey) drag.current = { kind: "crop", i, sx: e.clientX, sy: e.clientY, fx: s.fx ?? 0.5, fy: s.fy ?? 0.45 };
    else drag.current = { kind: "move", i, sx: e.clientX, sy: e.clientY, start: { ...s.frame } };
  }

  function startResize(corner: "nw" | "ne" | "sw" | "se", e: RPointerEvent<HTMLElement>) {
    if (sel === null) return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = { kind: "resize", i: sel, corner, sx: e.clientX, sy: e.clientY, start: { ...cur.current.slots[sel].frame } };
  }

  function onMove(e: RPointerEvent<HTMLDivElement>) {
    const d = drag.current;
    const el = box.current;
    if (!d || !el) return;
    const rect = el.getBoundingClientRect();
    const dx = ((e.clientX - d.sx) / rect.width) * 2; // jednostki rozkładówki (0–2)
    const dy = (e.clientY - d.sy) / rect.height; // 0–1

    if (d.kind === "move") {
      let f = { ...d.start, x: d.start.x + dx, y: d.start.y + dy };
      const sn = snapFrame(f, d.i, true);
      f = sn.f;
      f.x = Math.min(2 - f.w, Math.max(0, f.x));
      f.y = Math.min(1 - f.h, Math.max(0, f.y));
      setGuides({ x: sn.gx, y: sn.gy });
      setSlot(d.i, { frame: f });
    } else if (d.kind === "resize") {
      const s0 = d.start;
      let { x, y, w, h } = s0;
      const minW = MIN / ratio;
      if (d.corner.includes("e")) w = Math.min(2 - x, Math.max(minW, s0.w + dx));
      if (d.corner.includes("s")) h = Math.min(1 - y, Math.max(MIN, s0.h + dy));
      if (d.corner.includes("w")) {
        const nx = Math.min(s0.x + s0.w - minW, Math.max(0, s0.x + dx));
        w = s0.w + (s0.x - nx);
        x = nx;
      }
      if (d.corner.includes("n")) {
        const ny = Math.min(s0.y + s0.h - MIN, Math.max(0, s0.y + dy));
        h = s0.h + (s0.y - ny);
        y = ny;
      }
      // Shift: zachowaj proporcje ramki
      if (e.shiftKey) {
        const ar = s0.w / s0.h;
        if (Math.abs(dx) > Math.abs(dy)) {
          const nh = w / ar;
          if (d.corner.includes("n")) y = s0.y + s0.h - nh;
          h = nh;
        } else {
          const nw = h * ar;
          if (d.corner.includes("w")) x = s0.x + s0.w - nw;
          w = nw;
        }
      }
      // przyciąganie krawędzi, które się przesuwają
      const xs = [0, 0.5, 1, 1.5, 2, ...cur.current.slots.filter((_, k) => k !== d.i).flatMap((s) => [s.frame.x, s.frame.x + s.frame.w])];
      const ys = [0, 0.5, 1, ...cur.current.slots.filter((_, k) => k !== d.i).flatMap((s) => [s.frame.y, s.frame.y + s.frame.h])];
      const gx: number[] = [];
      const gy: number[] = [];
      const sx = SNAP / ratio;
      if (!e.shiftKey) {
        if (d.corner.includes("e")) {
          const hit = xs.find((v) => Math.abs(v - (x + w)) < sx);
          if (hit !== undefined) (w = hit - x), gx.push(hit);
        } else {
          const hit = xs.find((v) => Math.abs(v - x) < sx);
          if (hit !== undefined) (w = w + (x - hit)), (x = hit), gx.push(hit);
        }
        if (d.corner.includes("s")) {
          const hit = ys.find((v) => Math.abs(v - (y + h)) < SNAP);
          if (hit !== undefined) (h = hit - y), gy.push(hit);
        } else {
          const hit = ys.find((v) => Math.abs(v - y) < SNAP);
          if (hit !== undefined) (h = h + (y - hit)), (y = hit), gy.push(hit);
        }
      }
      setGuides({ x: gx, y: gy });
      setSlot(d.i, { frame: { x, y, w: Math.max(minW, w), h: Math.max(MIN, h) } });
    } else {
      // przesuwanie kadru: o ile zdjęcie wystaje poza ramkę
      const s = cur.current.slots[d.i];
      const fw = (s.frame.w / 2) * rect.width;
      const fh = s.frame.h * rect.height;
      const a = project.aspects[s.photo] ?? 1.5;
      const zoom = Math.max(1, s.zoom ?? 1);
      const fa = fw / fh;
      const iw = (a > fa ? fh * a : fw) * zoom;
      const ih = (a > fa ? fh : fw / a) * zoom;
      const ox = iw - fw;
      const oy = ih - fh;
      setSlot(d.i, {
        fx: ox > 1 ? Math.min(1, Math.max(0, d.fx - (e.clientX - d.sx) / ox)) : 0.5,
        fy: oy > 1 ? Math.min(1, Math.max(0, d.fy - (e.clientY - d.sy) / oy)) : 0.5,
      });
    }
  }

  function end() {
    drag.current = null;
    setGuides({ x: [], y: [] });
  }

  const s = sel !== null ? spread.slots[sel] : null;
  const maxLayer = Math.max(0, ...spread.slots.map((x) => x.layer ?? 0));
  const minLayer = Math.min(0, ...spread.slots.map((x) => x.layer ?? 0));

  // ramka dopasowana do proporcji zdjęcia (bez przycinania), w środku obecnej ramki
  function fitToPhoto() {
    if (!s || sel === null) return;
    const a = project.aspects[s.photo] ?? 1.5;
    const area = s.frame.w * ratio * s.frame.h;
    let h = Math.sqrt(area / a);
    let w = (h * a) / ratio;
    if (h > 1) (h = 1), (w = (a * h) / ratio);
    if (w > 2) (w = 2), (h = (w * ratio) / a);
    const cx = s.frame.x + s.frame.w / 2;
    const cy = s.frame.y + s.frame.h / 2;
    setSlot(sel, {
      frame: { x: Math.min(2 - w, Math.max(0, cx - w / 2)), y: Math.min(1 - h, Math.max(0, cy - h / 2)), w, h },
      fx: 0.5,
      fy: 0.5,
      zoom: 1,
    });
  }

  return (
    <div className="spe-modal" role="dialog" aria-modal="true" aria-label={t("Edycja rozkładówki", "Edit spread")}>
      <div className="spe-bar">
        <div className="spe-tools">
          <button type="button" className={cropMode ? "on" : ""} onClick={() => setCropMode(!cropMode)} title={t("Albo przeciągaj z wciśniętym Alt", "Or drag holding Alt")}>
            {cropMode ? t("✓ Przesuwanie kadru", "✓ Moving the crop") : t("Przesuń kadr w ramce", "Move the crop")}
          </button>
          <label className="spe-zoom">
            {t("Powiększenie", "Zoom")}
            <input
              type="range"
              min={1}
              max={3}
              step={0.02}
              disabled={!s}
              value={s?.zoom ?? 1}
              onChange={(e) => sel !== null && setSlot(sel, { zoom: Number(e.target.value) })}
            />
          </label>
          <button type="button" disabled={!s} onClick={fitToPhoto}>{t("Ramka jak zdjęcie", "Fit frame to photo")}</button>
          <button type="button" disabled={!s} onClick={() => sel !== null && setSlot(sel, { layer: maxLayer + 1 })}>{t("Na wierzch", "Bring to front")}</button>
          <button type="button" disabled={!s} onClick={() => sel !== null && setSlot(sel, { layer: minLayer - 1 < 0 ? 0 : minLayer - 1 })}>{t("Pod spód", "Send to back")}</button>
          {isBlurBg(project.bg) && (
            <button type="button" disabled={!s} onClick={() => s && onChange({ ...spread, bgPhoto: s.photo })}>{t("To zdjęcie w tle", "Use as background")}</button>
          )}
          <button
            type="button"
            disabled={!s}
            onClick={() => {
              if (sel === null) return;
              onRemovePhoto(sel);
              setSel(null);
            }}
          >
            {t("Usuń zdjęcie", "Remove photo")}
          </button>
        </div>
        <button type="button" className="btn btn-dark spe-done" onClick={onClose}>
          {t("Gotowe", "Done")}
        </button>
      </div>

      <div className="spe-stage" onPointerDown={() => setSel(null)}>
        <div
          ref={box}
          className={`spe-box${cropMode ? " crop" : ""}`}
          style={{ aspectRatio: `${2 * ratio}` }}
          onPointerMove={onMove}
          onPointerUp={end}
          onPointerCancel={end}
        >
          <AlbumSpreadView spread={spread} project={project} byName={byName} ratio={ratio} selected={sel} className="spe-canvas" onSlotPointerDown={start}>
            {s && sel !== null && (
              <div
                className="spe-sel"
                style={{
                  zIndex: 100,
                  left: `${(s.frame.x / 2) * 100}%`,
                  top: `${s.frame.y * 100}%`,
                  width: `${(s.frame.w / 2) * 100}%`,
                  height: `${s.frame.h * 100}%`,
                }}
              >
                {(["nw", "ne", "sw", "se"] as const).map((c) => (
                  <span key={c} className={`spe-h ${c}`} onPointerDown={(e) => startResize(c, e)} />
                ))}
              </div>
            )}
            {guides.x.map((x, i) => (
              <span key={`x${i}`} className="spe-guide v" style={{ left: `${(x / 2) * 100}%` }} />
            ))}
            {guides.y.map((y, i) => (
              <span key={`y${i}`} className="spe-guide h" style={{ top: `${y * 100}%` }} />
            ))}
          </AlbumSpreadView>
        </div>
      </div>

      <p className="spe-help">
        {t(
          "Przeciągnij zdjęcie, aby je przesunąć (przyciąga się do krawędzi, środka i grzbietu). Narożniki zmieniają rozmiar – z Shift zachowują proporcje. Kadr w ramce przesuniesz przyciskiem „Przesuń kadr” albo z wciśniętym Alt, a suwakiem go powiększysz.",
          "Drag a photo to move it (it snaps to edges, centre and the spine). Corners resize – hold Shift to keep proportions. Move the crop with “Move the crop” or by holding Alt, and zoom it with the slider.",
        )}
      </p>
    </div>
  );
}
