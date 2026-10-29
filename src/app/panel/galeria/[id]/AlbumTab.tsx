"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLang } from "@/components/LangProvider";
import { tr } from "@/lib/lang";
import {
  ALBUM_SIZES,
  ALBUM_STYLES,
  BG_COLORS,
  emptyProject,
  pageRange,
  PAGE_OPTIONS,
  generateAlbum,
  layoutSpread,
  usedPhotos,
  type AlbumBg,
  type AlbumProject,
  type AlbumStyle,
  type Spread,
} from "@/lib/album-layout";
import AlbumSubCard from "@/app/panel/albumy/AlbumSubCard";
import type { Billing } from "@/lib/billing";

type Photo = { name: string; url: string };
type Selection = { id: string; name: string; photos: string[] };
type Pick = { spread: string; slot: number } | null;

const MAX_SLOTS = 8;

// Projektor albumów w galerii: projekt z wyboru klienta, prosta edycja i pliki do druku
export default function AlbumTab({
  id,
  galleryTitle,
  subtitle,
  photos,
  selections,
  initial,
  active,
  paidUntil,
  balance,
  billing,
}: {
  id: string;
  galleryTitle: string;
  subtitle: string;
  photos: Photo[];
  selections: Selection[];
  initial: AlbumProject | null;
  active: boolean;
  paidUntil: string | null;
  balance: number;
  billing: Billing;
}) {
  const lang = useLang();
  const t = (pl: string, en: string) => tr(lang, pl, en);
  const byName = useMemo(() => new Map(photos.map((p) => [p.name, p])), [photos]);
  const allPicked = useMemo(() => {
    const seen = new Set<string>();
    const order = photos.map((p) => p.name);
    for (const s of selections) for (const n of s.photos) seen.add(n);
    return order.filter((n) => seen.has(n));
  }, [photos, selections]);

  const [project, setProject] = useState<AlbumProject>(
    () => initial ?? emptyProject(selections.length === 1 ? selections[0].id : "all", galleryTitle, subtitle),
  );
  const [pick, setPick] = useState<Pick>(null);
  const [addTo, setAddTo] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState<{ done: number; total: number } | null>(null);
  const [exporting, setExporting] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<"idle" | "saving" | "saved">("idle");
  const firstSave = useRef(true);

  // Zdjęcia źródłowe: wybór jednego klienta albo wszystkie wybory razem (w kolejności galerii)
  const source = useMemo(() => {
    if (project.source === "all") return allPicked;
    const s = selections.find((x) => x.id === project.source);
    if (!s) return allPicked;
    const set = new Set(s.photos);
    return photos.map((p) => p.name).filter((n) => set.has(n));
  }, [project.source, selections, photos, allPicked]);

  const used = useMemo(() => usedPhotos(project.spreads), [project.spreads]);
  const unused = source.filter((n) => !used.has(n) && byName.has(n));
  const photoCount = used.size;

  // Zapis projektu (z opóźnieniem, żeby nie zapisywać przy każdym kliknięciu)
  useEffect(() => {
    if (firstSave.current) {
      firstSave.current = false;
      return;
    }
    setSaved("saving");
    const h = setTimeout(async () => {
      const res = await fetch(`/api/galleries/${id}/album`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", project }),
      }).catch(() => null);
      setSaved(res?.ok ? "saved" : "idle");
    }, 900);
    return () => clearTimeout(h);
  }, [project, id]);

  const update = (patch: Partial<AlbumProject>) => setProject((p) => ({ ...p, ...patch }));

  // Proporcje zdjęć (wczytujemy podglądy tylko raz – zapisują się w projekcie)
  async function ensureAspects(names: string[]) {
    const missing = names.filter((n) => !project.aspects[n] && byName.has(n));
    if (!missing.length) return project.aspects;
    const found: Record<string, number> = {};
    let done = 0;
    setAnalyzing({ done: 0, total: missing.length });
    let next = 0;
    const worker = async () => {
      while (next < missing.length) {
        const n = missing[next++];
        found[n] = await new Promise<number>((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img.naturalWidth / Math.max(1, img.naturalHeight));
          img.onerror = () => resolve(1.5);
          img.src = byName.get(n)!.url;
        });
        setAnalyzing({ done: ++done, total: missing.length });
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));
    setAnalyzing(null);
    return { ...project.aspects, ...found };
  }

  async function generate(newSeed: boolean, pagesOverride?: number | null) {
    const pagesWanted = pagesOverride === undefined ? (project.pages ?? null) : pagesOverride;
    setError("");
    if (!source.length) {
      setError(t("Klient nie wybrał jeszcze zdjęć do albumu.", "Your client hasn't picked any photos for the album yet."));
      return;
    }
    if (project.spreads.length && !window.confirm(t("Wygenerować projekt od nowa? Twoje zmiany zostaną zastąpione.", "Generate the design again? Your edits will be replaced."))) return;
    const aspects = await ensureAspects(source);
    const seed = newSeed || !project.spreads.length ? Math.floor(Math.random() * 1e9) : project.seed;
    setPick(null);
    setAddTo(null);
    setProject((p) => ({ ...p, aspects, seed, pages: pagesWanted, spreads: generateAlbum(source, aspects, p.style, seed, p.titlePage, pagesWanted) }));
  }

  // ===== Edycja =====

  const relayout = (s: Spread, names: string[], variant = 0): Spread | null =>
    names.length ? { ...layoutSpread(names, project.aspects, project.style, variant, project.seed), id: s.id } : null;

  const setSpreads = (fn: (list: Spread[]) => Spread[]) => setProject((p) => ({ ...p, spreads: fn(p.spreads) }));

  function changeLayout(s: Spread) {
    const r = relayout(s, s.slots.map((x) => x.photo), s.variant + 1);
    if (r) setSpreads((list) => list.map((x) => (x.id === s.id ? r : x)));
  }

  function move(index: number, dir: -1 | 1) {
    setSpreads((list) => {
      const j = index + dir;
      if (j < 0 || j >= list.length) return list;
      const copy = [...list];
      [copy[index], copy[j]] = [copy[j], copy[index]];
      return copy;
    });
  }

  function removeSpread(s: Spread) {
    setPick(null);
    setSpreads((list) => list.filter((x) => x.id !== s.id));
  }

  function removePhoto(sp: Spread, slot: number) {
    setPick(null);
    const names = sp.slots.map((x) => x.photo).filter((_, i) => i !== slot);
    const r = relayout(sp, names);
    setSpreads((list) => (r ? list.map((x) => (x.id === sp.id ? r : x)) : list.filter((x) => x.id !== sp.id)));
  }

  function clickPhoto(sp: Spread, slot: number) {
    if (!pick) return setPick({ spread: sp.id, slot });
    if (pick.spread === sp.id && pick.slot === slot) return setPick(null);
    // zamiana dwóch zdjęć (także między rozkładówkami); układ dopasowuje się do proporcji
    const a = project.spreads.find((x) => x.id === pick.spread)!;
    const pa = a.slots[pick.slot].photo;
    const pb = sp.slots[slot].photo;
    setSpreads((list) =>
      list.map((x) => {
        if (x.id !== a.id && x.id !== sp.id) return x;
        const names = x.slots.map((s, i) => {
          if (x.id === a.id && i === pick.slot) return pb;
          if (x.id === sp.id && i === slot) return pa;
          return s.photo;
        });
        if (x.id === a.id && x.id === sp.id) {
          // ta sama rozkładówka: zamieniamy miejscami w tych samych ramkach
          return { ...x, slots: x.slots.map((s, i) => ({ ...s, photo: names[i], fx: undefined, fy: undefined })) };
        }
        return relayout(x, names) ?? x;
      }),
    );
    setPick(null);
  }

  function nudge(dx: number, dy: number) {
    if (!pick) return;
    setSpreads((list) =>
      list.map((x) =>
        x.id !== pick.spread
          ? x
          : {
              ...x,
              slots: x.slots.map((s, i) =>
                i !== pick.slot ? s : { ...s, fx: Math.min(1, Math.max(0, (s.fx ?? 0.5) + dx)), fy: Math.min(1, Math.max(0, (s.fy ?? 0.45) + dy)) },
              ),
            },
      ),
    );
  }

  async function clickUnused(name: string) {
    const aspects = await ensureAspects([name]);
    if (aspects !== project.aspects) update({ aspects });
    const asp = { ...project.aspects, ...aspects };
    const lay = (names: string[], s: Spread) => ({ ...layoutSpread(names, asp, project.style, 0, project.seed), id: s.id });
    if (pick) {
      // zamiana wybranego zdjęcia na nieużyte
      setSpreads((list) => list.map((x) => (x.id !== pick.spread ? x : lay(x.slots.map((s, i) => (i === pick.slot ? name : s.photo)), x))));
      setPick(null);
      return;
    }
    if (addTo) {
      setSpreads((list) => list.map((x) => (x.id !== addTo || x.slots.length >= MAX_SLOTS ? x : lay([...x.slots.map((s) => s.photo), name], x))));
      return;
    }
    // bez zaznaczenia: nowa rozkładówka na końcu
    setSpreads((list) => [...list, layoutSpread([name], asp, project.style, 0, project.seed)]);
  }

  async function download() {
    setError("");
    try {
      const names = [...used];
      const res = await fetch(`/api/galleries/${id}/album`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "export", names }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setExporting({ done: 0, total: project.spreads.length });
      const { exportAlbum } = await import("@/lib/album-render");
      const fallback = Object.fromEntries(photos.map((p) => [p.name, p.url]));
      const slug = (galleryTitle || "album").normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "album";
      const zip = await exportAlbum(project, data.urls ?? {}, fallback, (done, total) => setExporting({ done, total }), slug);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(zip);
      a.download = `${slug}-album-${project.size}x${project.size}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Nie udało się przygotować plików.", "Could not prepare the files."));
    } finally {
      setExporting(null);
    }
  }

  const styleName: Record<AlbumStyle, string> = {
    minimal: t("Minimal", "Minimal"),
    editorial: t("Magazyn", "Editorial"),
    classic: t("Klasyczny", "Classic"),
  };
  const bgName: Record<AlbumBg, string> = { white: t("Białe", "White"), ivory: t("Kremowe", "Ivory"), black: t("Czarne", "Black") };
  const colors = BG_COLORS[project.bg];
  const pages = project.spreads.length * 2;

  return (
    <div className="alb">
      <section className="settings-card alb-setup">
        <div className="alb-head">
          <div>
            <h2>{t("Projektor albumów", "Album designer")}</h2>
            <p className="hint-inline">
              {t(
                "Klient zaznacza w galerii zdjęcia do albumu (serduszko). Lenslie układa z nich gotowe rozkładówki – możesz je poprawić i pobrać pliki do drukarni.",
                "Your client marks album photos in the gallery (heart). Lenslie lays them out into finished spreads – adjust them and download print-ready files.",
              )}
            </p>
          </div>
          {saved !== "idle" && <span className="alb-saved">{saved === "saving" ? t("Zapisuję…", "Saving…") : t("Zapisano", "Saved")}</span>}
        </div>

        <div className="alb-controls">
          <label className="alb-field">
            <span>{t("Zdjęcia z wyboru", "Photos from")}</span>
            <select className="plain-select" value={project.source} onChange={(e) => update({ source: e.target.value })}>
              <option value="all">
                {t("Wszystkie wybory klientów", "All client selections")} ({allPicked.length})
              </option>
              {selections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name || t("Klient", "Client")} ({s.photos.length})
                </option>
              ))}
            </select>
          </label>

          <div className="alb-field">
            <span>{t("Format", "Size")}</span>
            <div className="seg">
              {ALBUM_SIZES.map((s) => (
                <button key={s} type="button" className={project.size === s ? "on" : ""} onClick={() => update({ size: s })}>
                  {s}×{s} cm
                </button>
              ))}
            </div>
          </div>

          <div className="alb-field">
            <span>{t("Styl", "Style")}</span>
            <div className="seg">
              {ALBUM_STYLES.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={project.style === s ? "on" : ""}
                  onClick={() =>
                    // nowy styl: te same zdjęcia na tych samych rozkładówkach, nowe układy
                    setProject((p) => ({
                      ...p,
                      style: s,
                      spreads: p.spreads.map((sp) =>
                        sp.kind === "title" ? sp : { ...layoutSpread(sp.slots.map((x) => x.photo), p.aspects, s, 0, p.seed), id: sp.id },
                      ),
                    }))
                  }
                >
                  {styleName[s]}
                </button>
              ))}
            </div>
          </div>

          <label className="alb-field">
            <span>{t("Liczba stron", "Number of pages")}</span>
            <select
              className="plain-select alb-pages"
              value={project.pages ?? ""}
              onChange={(e) => {
                const v = e.target.value ? Number(e.target.value) : null;
                if (project.spreads.length) generate(false, v);
                else update({ pages: v });
              }}
            >
              <option value="">{t("Automatycznie", "Automatic")}</option>
              {PAGE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n} {t("stron", "pages")} ({n / 2} {t("rozkł.", "spreads")})
                </option>
              ))}
            </select>
          </label>

          <div className="alb-field">
            <span>{t("Tło stron", "Page colour")}</span>
            <div className="alb-swatches">
              {(Object.keys(BG_COLORS) as AlbumBg[]).map((b) => (
                <button
                  key={b}
                  type="button"
                  title={bgName[b]}
                  aria-label={bgName[b]}
                  className={project.bg === b ? "on" : ""}
                  style={{ background: BG_COLORS[b].bg }}
                  onClick={() => update({ bg: b })}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="alb-controls">
          <label className="check alb-check">
            <input
              type="checkbox"
              checked={project.titlePage}
              onChange={(e) => {
                const on = e.target.checked;
                setProject((p) => ({
                  ...p,
                  titlePage: on,
                  spreads: on
                    ? p.spreads.some((s) => s.kind === "title") || !p.spreads.length
                      ? p.spreads
                      : [{ id: `t${Date.now()}`, kind: "title", slots: [], variant: 0 }, ...p.spreads]
                    : p.spreads.filter((s) => s.kind !== "title"),
                }));
              }}
            />
            {t("Strona tytułowa", "Title page")}
          </label>
          {project.titlePage && (
            <>
              <input className="alb-text" value={project.title} maxLength={120} onChange={(e) => update({ title: e.target.value })} placeholder={t("np. Anna & Marek", "e.g. Anna & Mark")} />
              <input className="alb-text" value={project.subtitle} maxLength={120} onChange={(e) => update({ subtitle: e.target.value })} placeholder={t("np. 14 września 2026", "e.g. 14 September 2026")} />
            </>
          )}
          <label className="check alb-check">
            <input type="checkbox" checked={project.bleed} onChange={(e) => update({ bleed: e.target.checked })} />
            {t("Spad 3 mm", "3 mm bleed")}
          </label>
        </div>

        <div className="alb-actions">
          <button type="button" className="btn btn-dark" disabled={Boolean(analyzing)} onClick={() => generate(true)}>
            {project.spreads.length ? t("Wygeneruj od nowa", "Generate again") : t("Wygeneruj projekt albumu", "Generate album design")}
          </button>
          {project.spreads.length > 0 && (
            <span className="alb-summary">
              {project.spreads.length} {t("rozkładówek", "spreads")} · {pages} {t("stron", "pages")} · {photoCount} {t("zdjęć", "photos")}
            </span>
          )}
          {analyzing && (
            <span className="alb-summary">
              {t("Analizuję zdjęcia", "Analysing photos")} {analyzing.done}/{analyzing.total}…
            </span>
          )}
        </div>
        {project.pages && source.length > 0 && (() => {
          const r = pageRange(source.length, project.titlePage);
          const per = (source.length / Math.max(1, project.pages / 2 - (project.titlePage ? 1 : 0))).toFixed(1).replace(".", ",");
          if (project.pages < r.min)
            return (
              <p className="warn-inline alb-tip">
                {t(
                  `${source.length} zdjęć nie zmieści się na ${project.pages} stronach (najwyżej 8 na rozkładówkę) – album będzie miał ${r.min} stron. Wybierz więcej stron albo mniej zdjęć.`,
                  `${source.length} photos won't fit on ${project.pages} pages (max 8 per spread) – the album will have ${r.min} pages. Choose more pages or fewer photos.`,
                )}
              </p>
            );
          if (project.pages > r.max)
            return (
              <p className="warn-inline alb-tip">
                {t(
                  `Za mało zdjęć na ${project.pages} stron – każde zdjęcie dostanie własną rozkładówkę, a album będzie miał ${r.max} stron. Poproś klienta o wybranie większej liczby zdjęć.`,
                  `Not enough photos for ${project.pages} pages – each photo gets its own spread and the album will have ${r.max} pages. Ask your client to pick more photos.`,
                )}
              </p>
            );
          return (
            <p className="hint-inline alb-tip">
              {t(`Średnio ${per} zdjęcia na rozkładówkę.`, `About ${per} photos per spread on average.`)}
            </p>
          );
        })()}
        {project.spreads.length > 0 && (
          <p className="hint-inline alb-tip">
            {t(
              "Kliknij zdjęcie, a potem drugie, aby je zamienić. „Zmień układ” proponuje inne ułożenie rozkładówki, a strzałki zmieniają kolejność.",
              "Click a photo, then another, to swap them. “Change layout” suggests another arrangement; the arrows change the order.",
            )}
          </p>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {!selections.length && (
          <p className="warn-inline">
            {t(
              "Nikt jeszcze nie wybrał zdjęć w tej galerii. Ustaw limit wyboru „do albumu” w Ustawieniach galerii i wyślij klientowi link.",
              "No one has picked photos in this gallery yet. Set a selection limit “for the album” in the gallery settings and send your client the link.",
            )}
          </p>
        )}
      </section>

      {project.spreads.length > 0 && (
        <>
          {pick && (
            <div className="alb-pickbar" role="status">
              <span>{t("Kliknij inne zdjęcie, aby je zamienić, albo zdjęcie z listy poniżej.", "Click another photo to swap, or a photo from the list below.")}</span>
              <span className="alb-nudge">
                {t("Kadr", "Crop")}
                <button type="button" onClick={() => nudge(0, -0.12)} aria-label={t("w górę", "up")}>↑</button>
                <button type="button" onClick={() => nudge(0, 0.12)} aria-label={t("w dół", "down")}>↓</button>
                <button type="button" onClick={() => nudge(-0.12, 0)} aria-label={t("w lewo", "left")}>←</button>
                <button type="button" onClick={() => nudge(0.12, 0)} aria-label={t("w prawo", "right")}>→</button>
              </span>
              <button
                type="button"
                className="as-link"
                onClick={() => {
                  const sp = project.spreads.find((x) => x.id === pick.spread);
                  if (sp) removePhoto(sp, pick.slot);
                }}
              >
                {t("Usuń z albumu", "Remove from album")}
              </button>
              <button type="button" className="as-link" onClick={() => setPick(null)}>
                {t("Anuluj", "Cancel")}
              </button>
            </div>
          )}

          <div className="alb-spreads">
            {project.spreads.map((s, i) => (
              <figure key={s.id} className={addTo === s.id ? "alb-spread adding" : "alb-spread"}>
                <div className="alb-canvas" style={{ background: colors.bg }}>
                  {s.kind === "title" ? (
                    <div className="alb-title" style={{ color: colors.ink }}>
                      <strong>{project.title}</strong>
                      <i style={{ background: colors.muted }} />
                      <small style={{ color: colors.muted }}>{project.subtitle}</small>
                    </div>
                  ) : (
                    s.slots.map((sl, k) => {
                      const ph = byName.get(sl.photo);
                      const on = pick?.spread === s.id && pick.slot === k;
                      return (
                        <button
                          key={k}
                          type="button"
                          className={on ? "alb-slot on" : "alb-slot"}
                          style={{
                            left: `${(sl.frame.x / 2) * 100}%`,
                            top: `${sl.frame.y * 100}%`,
                            width: `${(sl.frame.w / 2) * 100}%`,
                            height: `${sl.frame.h * 100}%`,
                          }}
                          onClick={() => clickPhoto(s, k)}
                        >
                          {ph && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={ph.url} alt="" loading="lazy" style={{ objectPosition: `${(sl.fx ?? 0.5) * 100}% ${(sl.fy ?? 0.45) * 100}%` }} />
                          )}
                        </button>
                      );
                    })
                  )}
                  <span className="alb-gutter" />
                </div>
                <figcaption>
                  <span className="alb-num">
                    {s.kind === "title" ? t("Strona tytułowa", "Title page") : `${t("Rozkładówka", "Spread")} ${i + 1}`} · {t("str.", "p.")} {i * 2 + 1}–{i * 2 + 2}
                  </span>
                  <span className="alb-tools">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={t("Przesuń wcześniej", "Move earlier")}>←</button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === project.spreads.length - 1} aria-label={t("Przesuń dalej", "Move later")}>→</button>
                    {s.kind === "photos" && (
                      <>
                        <button type="button" onClick={() => changeLayout(s)}>{t("Zmień układ", "Change layout")}</button>
                        <button type="button" className={addTo === s.id ? "on" : ""} disabled={s.slots.length >= MAX_SLOTS} onClick={() => setAddTo(addTo === s.id ? null : s.id)}>
                          {t("+ Zdjęcie", "+ Photo")}
                        </button>
                      </>
                    )}
                    <button type="button" onClick={() => removeSpread(s)}>{t("Usuń", "Delete")}</button>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>

          <section className="settings-card alb-unused">
            <h2>
              {t("Zdjęcia poza albumem", "Photos not in the album")} <span className="side-count">{unused.length}</span>
            </h2>
            <p className="hint-inline">
              {pick
                ? t("Kliknij zdjęcie, aby wstawić je w miejsce zaznaczonego.", "Click a photo to put it in place of the selected one.")
                : addTo
                  ? t("Kliknij zdjęcie, aby dodać je do wybranej rozkładówki.", "Click a photo to add it to the chosen spread.")
                  : t("Kliknij zdjęcie, aby dodać je na nowej rozkładówce na końcu albumu.", "Click a photo to add it on a new spread at the end.")}
            </p>
            {unused.length === 0 ? (
              <p className="hint-inline">{t("Wszystkie wybrane zdjęcia są w albumie.", "All selected photos are in the album.")}</p>
            ) : (
              <div className="alb-tray">
                {unused.map((n) => (
                  <button key={n} type="button" onClick={() => clickUnused(n)} title={n}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={byName.get(n)!.url} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="settings-card alb-download">
            <h2>{t("Pliki do drukarni", "Print files")}</h2>
            <p className="hint-inline">
              {t(
                `Każda rozkładówka jako osobny plik JPEG ${project.size * 2}×${project.size} cm, 300 dpi, sRGB${project.bleed ? ", ze spadem 3 mm" : ""} – z oryginałów zdjęć, w jednym pliku ZIP.`,
                `Each spread as a separate ${project.size * 2}×${project.size} cm JPEG, 300 dpi, sRGB${project.bleed ? ", with 3 mm bleed" : ""} – from the original photos, in one ZIP file.`,
              )}
            </p>
            {active ? (
              exporting ? (
                <div className="video-up" aria-live="polite">
                  <div className="video-up-line">
                    <span>{t("Przygotowuję rozkładówki z oryginałów…", "Rendering spreads from the originals…")}</span>
                    <span>
                      {exporting.done} / {exporting.total}
                    </span>
                  </div>
                  <div className="up-total">
                    <span style={{ width: `${Math.round((exporting.done / Math.max(1, exporting.total)) * 100)}%` }} />
                  </div>
                  <small className="hint-inline">{t("Nie zamykaj tej karty. Duże albumy mogą potrwać kilka minut.", "Keep this tab open. Large albums can take a few minutes.")}</small>
                </div>
              ) : (
                <>
                  <button type="button" className="btn btn-dark" onClick={download}>
                    {t("Pobierz rozkładówki (ZIP)", "Download spreads (ZIP)")}
                  </button>
                  {paidUntil && (
                    <p className="hint-inline">
                      {t("Abonament aktywny do", "Subscription active until")} {new Date(paidUntil).toLocaleDateString(lang === "en" ? "en-GB" : "pl-PL")}
                    </p>
                  )}
                </>
              )
            ) : (
              <AlbumSubCard balance={balance} billing={billing} returnPath={`/panel/galeria/${id}`} compact />
            )}
          </section>
        </>
      )}
    </div>
  );
}
