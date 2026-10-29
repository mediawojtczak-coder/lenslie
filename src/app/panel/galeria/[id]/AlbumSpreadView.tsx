"use client";

import type { CSSProperties, ReactNode } from "react";
type RPointerEvent<T> = React.PointerEvent<T>;
import { BG_COLORS, backgroundPhoto, isBlurBg, touches, type AlbumProject, type Spread } from "@/lib/album-layout";

type Photo = { name: string; url: string };

// Podgląd rozkładówki – ten sam wygląd na liście i w edytorze swobodnym (jak w pliku do druku)
export default function AlbumSpreadView({
  spread,
  project,
  byName,
  ratio,
  selected = null,
  className = "",
  onSlotClick,
  onSlotPointerDown,
  children,
}: {
  spread: Spread;
  project: AlbumProject;
  byName: Map<string, Photo>;
  ratio: number;
  selected?: number | null;
  className?: string;
  onSlotClick?: (index: number) => void;
  onSlotPointerDown?: (index: number, e: RPointerEvent<HTMLElement>) => void;
  children?: ReactNode;
}) {
  const colors = BG_COLORS[project.bg];
  const frameStyle = project.frame ?? "none";
  const u = Math.min(50, 50 / ratio); // 1 jednostka (krótszy bok strony) w cqw
  const mono = project.title
    .split(/[\s&+,-]+/)
    .filter((w) => /\p{L}/u.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase());
  const bgName = isBlurBg(project.bg) ? backgroundPhoto(spread, project.spreads) : null;
  const bgPh = bgName ? byName.get(bgName) : null;
  const aspectOf = (name: string) => project.aspects[name] ?? 1.5;

  return (
    <div
      className={`alb-canvas fr-${frameStyle} ${className}`}
      style={{ background: colors.bg, aspectRatio: `${2 * ratio}`, ["--u" as string]: `${u}cqw`, ["--muted" as string]: colors.muted } as CSSProperties}
    >
      {isBlurBg(project.bg) && (
        <>
          {bgPh && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="alb-bgimg"
              src={bgPh.url}
              alt=""
              loading="lazy"
              draggable={false}
              style={{ filter: `blur(${(Math.max(0, Math.min(1, project.blur ?? 0.5)) * 4.4).toFixed(2)}cqw)` }}
            />
          )}
          <span className="alb-wash" style={{ background: colors.wash }} />
        </>
      )}
      {spread.kind === "title" ? (
        <div className="alb-title" style={{ color: colors.ink, left: "50%", width: "50%" }}>
          {mono.length > 0 && (
            <span className="alb-mono" style={{ borderColor: colors.muted }}>
              {mono.join(mono.length > 1 ? " & " : "")}
            </span>
          )}
          <strong>{project.title}</strong>
          <i style={{ background: colors.muted }} />
          <small style={{ color: colors.muted }}>{project.subtitle}</small>
        </div>
      ) : (
        spread.slots.map((sl, k) => {
          const ph = byName.get(sl.photo);
          const t0 = touches(sl.frame);
          const edge = t0.left || t0.top || t0.right || t0.bottom;
          // kadr: zdjęcie przycięte jak „cover”, powiększone wokół punktu fx/fy (tak samo jak w pliku do druku)
          const frameAspect = (sl.frame.w * ratio) / sl.frame.h;
          const a = aspectOf(sl.photo);
          const zoom = Math.max(1, sl.zoom ?? 1);
          const wPct = (a > frameAspect ? (a / frameAspect) * 100 : 100) * zoom;
          const hPct = (a > frameAspect ? 100 : (frameAspect / a) * 100) * zoom;
          const fx = sl.fx ?? 0.5;
          const fy = sl.fy ?? 0.45;
          return (
            <div
              key={k}
              role="button"
              tabIndex={0}
              className={`alb-slot${selected === k ? " on" : ""}${edge ? " edge" : ""}`}
              style={{
                zIndex: 1 + (sl.layer ?? 0),
                left: `${(sl.frame.x / 2) * 100}%`,
                top: `${sl.frame.y * 100}%`,
                width: `${(sl.frame.w / 2) * 100}%`,
                height: `${sl.frame.h * 100}%`,
              }}
              onClick={onSlotClick ? () => onSlotClick(k) : undefined}
              onPointerDown={onSlotPointerDown ? (e) => onSlotPointerDown(k, e) : undefined}
            >
              <span className="alb-crop">
                {ph && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={ph.url}
                    alt=""
                    loading="lazy"
                    draggable={false}
                    style={{
                      width: `${wPct}%`,
                      height: `${hPct}%`,
                      left: `${(100 - wPct) * fx}%`,
                      top: `${(100 - hPct) * fy}%`,
                    }}
                  />
                )}
              </span>
            </div>
          );
        })
      )}
      <span className="alb-gutter" />
      {children}
    </div>
  );
}
