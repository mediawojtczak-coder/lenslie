// Projektor albumów: automatyczny układ rozkładówek (wspólny dla panelu i generowania plików).
// Współrzędne rozkładówki: szerokość 2 (dwie kwadratowe strony), wysokość 1. Lewa strona x 0–1, prawa 1–2.

// Format albumu: szerokość × wysokość jednej strony w cm (rozkładówka = 2 × szerokość)
export type AlbumSize = string; // np. "20x20", "30x20"
export type AlbumFormat = { id: AlbumSize; w: number; h: number; labs: string };
export type AlbumStyle = "atelier" | "minimal" | "editorial" | "classic";
// Tło stron: kolor albo rozmyte, rozjaśnione/przyciemnione zdjęcie z rozkładówki
export type AlbumBg = "white" | "ivory" | "black" | "blur-light" | "blur-dark";
// Wykończenie zdjęć: bez ramki, biała ramka z cieniem (jak odbitka), cienka linia
export type AlbumFrame = "none" | "white" | "line";

export type Frame = { x: number; y: number; w: number; h: number };
// fx, fy – punkt kadru (0–1), gdy zdjęcie jest przycięte; domyślnie środek
// layer – kolejność rysowania (zdjęcie nachodzące na inne ma wyższy numer)
// zoom – powiększenie kadru w ramce (1 = zdjęcie dokładnie wypełnia ramkę)
export type Slot = { photo: string; frame: Frame; fx?: number; fy?: number; layer?: number; zoom?: number };
export type Spread = {
  id: string;
  kind: "photos" | "title";
  slots: Slot[];
  variant: number; // który z możliwych układów (przycisk „Zmień układ”)
  bgPhoto?: string; // zdjęcie na rozmytym tle (domyślnie największe na rozkładówce)
};

export type AlbumProject = {
  size: AlbumSize;
  style: AlbumStyle;
  bg: AlbumBg;
  frame?: AlbumFrame;
  blur?: number; // siła rozmycia tła ze zdjęcia, 0–1 (domyślnie 0.5)
  source: string; // id wyboru klienta albo "all"
  title: string;
  subtitle: string;
  titlePage: boolean;
  bleed: boolean;
  pages?: number | null; // docelowa liczba stron albumu (null = automatycznie)
  spreads: Spread[];
  aspects: Record<string, number>; // szerokość / wysokość zdjęć
  seed: number;
  updatedAt?: string;
};

// Formaty popularnych drukarni (Uwolnij Kolory – fotoalbum i fotoksiążka, nPhoto – albumy)
export const ALBUM_FORMATS: AlbumFormat[] = [
  { id: "15x15", w: 15, h: 15, labs: "Uwolnij Kolory, nPhoto" },
  { id: "20x20", w: 20, h: 20, labs: "Uwolnij Kolory, nPhoto" },
  { id: "24x24", w: 24, h: 24, labs: "Uwolnij Kolory" },
  { id: "25x25", w: 25, h: 25, labs: "Uwolnij Kolory, nPhoto" },
  { id: "30x30", w: 30, h: 30, labs: "Uwolnij Kolory, nPhoto" },
  { id: "20x15", w: 20, h: 15, labs: "nPhoto" },
  { id: "30x20", w: 30, h: 20, labs: "nPhoto" },
  { id: "30x21", w: 30, h: 21, labs: "Uwolnij Kolory (A4)" },
  { id: "36x28", w: 36, h: 28, labs: "nPhoto" },
  { id: "40x30", w: 40, h: 30, labs: "nPhoto" },
  { id: "42x30", w: 42, h: 30, labs: "Uwolnij Kolory (A3)" },
  { id: "45x30", w: 45, h: 30, labs: "nPhoto" },
  { id: "15x20", w: 15, h: 20, labs: "nPhoto" },
  { id: "21x30", w: 21, h: 30, labs: "Uwolnij Kolory (A4)" },
  { id: "20x30", w: 20, h: 30, labs: "nPhoto" },
];
export const ALBUM_SIZES = ALBUM_FORMATS.map((f) => f.id);

// Format z projektu (starsze projekty miały liczbę, np. 20 = 20×20)
export function albumFormat(size: unknown): AlbumFormat {
  const id = typeof size === "number" ? `${size}x${size}` : String(size);
  return ALBUM_FORMATS.find((f) => f.id === id) ?? ALBUM_FORMATS[1];
}
export const pageRatio = (size: unknown) => {
  const f = albumFormat(size);
  return f.w / f.h;
};
export const ALBUM_STYLES: AlbumStyle[] = ["atelier", "editorial", "minimal", "classic"];
export const ALBUM_BGS: AlbumBg[] = ["blur-light", "blur-dark", "white", "ivory", "black"];
export const ALBUM_FRAMES: AlbumFrame[] = ["white", "line", "none"];

// wash – półprzezroczysta warstwa na rozmytym zdjęciu (jasna albo ciemna)
export const BG_COLORS: Record<AlbumBg, { bg: string; ink: string; muted: string; wash?: string }> = {
  white: { bg: "#ffffff", ink: "#2b2724", muted: "#8f8781" },
  ivory: { bg: "#f7f3ec", ink: "#2b2724", muted: "#8f8781" },
  black: { bg: "#151413", ink: "#f2ede6", muted: "#a59d95" },
  "blur-light": { bg: "#f4f1ec", ink: "#2b2724", muted: "#7d746d", wash: "rgba(250, 248, 244, 0.72)" },
  "blur-dark": { bg: "#1b1917", ink: "#f4efe8", muted: "#c7bdb3", wash: "rgba(20, 18, 16, 0.62)" },
};
export const isBlurBg = (bg: AlbumBg) => bg === "blur-light" || bg === "blur-dark";

// Zdjęcie na rozmyte tło: wybrane albo największe na rozkładówce
export function backgroundPhoto(spread: Spread, all?: Spread[]): string | null {
  if (spread.kind === "title") return spread.bgPhoto ?? all?.find((x) => x.slots.length)?.slots[0]?.photo ?? null;
  if (spread.bgPhoto && spread.slots.some((s) => s.photo === spread.bgPhoto)) return spread.bgPhoto;
  let best: Slot | null = null;
  for (const s of spread.slots) if (!best || s.frame.w * s.frame.h > best.frame.w * best.frame.h) best = s;
  return best?.photo ?? null;
}

type StyleCfg = {
  m: number; // margines strony (część boku)
  g: number; // odstęp między zdjęciami
  bleed: number; // skłonność do zdjęć na spad (0–1)
  pano: number; // co która rozkładówka może być panoramą (0 = nigdy)
  rhythm: number[]; // ile zdjęć na kolejnych stronach
};

const STYLES: Record<AlbumStyle, StyleCfg> = {
  // Luksusowy: zdjęcia jak odbitki na rozmytym tle, nachodzące kadry, dużo oddechu
  atelier: { m: 0.1, g: 0.032, bleed: 0.15, pano: 5, rhythm: [1, 2, 1, 1, 2, 1, 3, 1] },
  // Dużo powietrza, pojedyncze zdjęcia w passe-partout
  minimal: { m: 0.13, g: 0.04, bleed: 0.08, pano: 0, rhythm: [1, 1, 2, 1, 1, 2, 1, 3] },
  // Magazynowy: zdjęcia na spad, panoramy, asymetria
  editorial: { m: 0.09, g: 0.028, bleed: 0.55, pano: 4, rhythm: [1, 3, 1, 2, 1, 4, 2, 1] },
  // Klasyczny album ślubny: równe marginesy, siatki
  classic: { m: 0.075, g: 0.03, bleed: 0.2, pano: 6, rhythm: [2, 1, 2, 3, 1, 2, 4, 1] },
};

// ===== Szablony stron =====
// Liczone w rzeczywistych proporcjach strony (szerokość r, wysokość 1), a potem
// przeliczane na współrzędne strony (0–1 w poziomie), żeby marginesy były równe także na stronach niekwadratowych.

type PageTpl = { name: string; frames: Frame[]; bleed?: boolean; asym?: boolean; overlap?: boolean; luxe?: boolean };

function pageTemplates(style: AlbumStyle, r: number): PageTpl[] {
  const cfg = STYLES[style];
  const W = r;
  const H = 1;
  const base = Math.min(W, H);
  const m = cfg.m * base;
  const g = cfg.g * base;
  const iw = W - 2 * m;
  const ih = H - 2 * m;
  const t: PageTpl[] = [];
  const add = (name: string, frames: Frame[], extra: Partial<PageTpl> = {}) =>
    t.push({ name, frames: frames.map((f) => ({ x: f.x / W, y: f.y, w: f.w / W, h: f.h })), ...extra });
  const c = (w: number, h: number): Frame => ({ x: (W - w) / 2, y: (H - h) / 2, w, h });
  const fit = (aspect: number, maxW: number, maxH: number) => {
    const w = Math.min(maxW, maxH * aspect);
    return { w, h: w / aspect };
  };

  // 1 zdjęcie
  add("full", [{ x: 0, y: 0, w: W, h: H }], { bleed: true });
  {
    const f = fit(1.5, iw, ih);
    add("land", [c(f.w, f.h)]);
  }
  {
    const f = fit(2 / 3, iw, ih);
    add("port", [c(f.w, f.h)]);
  }
  {
    const s0 = Math.min(iw, ih) * 0.78;
    add("square", [c(s0, s0)]);
  }
  {
    const f = fit(2 / 3, iw * 0.6, ih * 0.75);
    add("port-small", [{ x: m * 1.4, y: m * 1.6, w: f.w, h: f.h }], { asym: true });
  }
  {
    const f = fit(1.5, iw * 0.82, ih * 0.6);
    add("land-low", [{ x: m, y: H - m * 1.3 - f.h, w: f.w, h: f.h }], { asym: true });
  }

  // 2 zdjęcia
  {
    const w = (iw - g) / 2;
    const h = Math.min(ih, w * 1.5);
    add("two-port", [{ x: m, y: (H - h) / 2, w, h }, { x: m + w + g, y: (H - h) / 2, w, h }]);
  }
  {
    const h = (ih - g) / 2;
    const w = Math.min(iw, h * 1.5);
    add("two-land", [{ x: (W - w) / 2, y: m, w, h }, { x: (W - w) / 2, y: m + h + g, w, h }]);
  }
  {
    // duże + małe (asymetria)
    const bw = iw * 0.6;
    const sw = iw - bw - g;
    const sh = Math.min(ih, sw * 1.25);
    add("two-mixed", [{ x: m, y: m, w: bw, h: ih }, { x: m + bw + g, y: m + ih - sh, w: sw, h: sh }], { asym: true });
  }
  add("two-bleed", [{ x: 0, y: 0, w: W / 2 - g / 2, h: H }, { x: W / 2 + g / 2, y: 0, w: W / 2 - g / 2, h: H }], { bleed: true });

  // 3 zdjęcia
  {
    const lw = (iw - g) * 0.5;
    const rw = iw - g - lw;
    const rh = (ih - g) / 2;
    add("three-left", [
      { x: m, y: m, w: lw, h: ih },
      { x: m + lw + g, y: m, w: rw, h: rh },
      { x: m + lw + g, y: m + rh + g, w: rw, h: rh },
    ]);
  }
  {
    const th = (ih - g) * 0.55;
    const bw = (iw - g) / 2;
    const bh = ih - g - th;
    add("three-top", [
      { x: m, y: m, w: iw, h: th },
      { x: m, y: m + th + g, w: bw, h: bh },
      { x: m + bw + g, y: m + th + g, w: bw, h: bh },
    ]);
  }
  {
    const w = (iw - 2 * g) / 3;
    const h = Math.min(ih, w * 1.5);
    add("three-row", [0, 1, 2].map((i) => ({ x: m + i * (w + g), y: (H - h) / 2, w, h })));
  }

  // 4 zdjęcia
  {
    const w = (iw - g) / 2;
    const h = (ih - g) / 2;
    add("four", [
      { x: m, y: m, w, h },
      { x: m + w + g, y: m, w, h },
      { x: m, y: m + h + g, w, h },
      { x: m + w + g, y: m + h + g, w, h },
    ]);
  }
  {
    const bh = (ih - g) * 0.62;
    const sw = (iw - 2 * g) / 3;
    const sh = ih - g - bh;
    add("four-strip", [{ x: m, y: m, w: iw, h: bh }, ...[0, 1, 2].map((i) => ({ x: m + i * (sw + g), y: m + bh + g, w: sw, h: sh }))]);
  }

  // Układy „luksusowe”: kadry nachodzące na siebie i zdjęcia w galeryjnym passe-partout
  if (style === "atelier" || style === "editorial") {
    {
      // duże zdjęcie + mniejsze nachodzące na prawy dolny róg
      const bw = iw * 0.8;
      const bh = ih * 0.74;
      const s0 = fit(2 / 3, iw * 0.4, ih * 0.52);
      add("overlap-br", [{ x: m, y: m, w: bw, h: bh }, { x: W - m - s0.w, y: H - m - s0.h, w: s0.w, h: s0.h }], { overlap: true, luxe: true });
    }
    {
      // pionowe zdjęcie + poziome nachodzące od dołu z lewej
      const bw = iw * 0.62;
      const s0 = fit(1.5, iw * 0.6, ih * 0.42);
      add("overlap-bl", [{ x: W - m - bw, y: m, w: bw, h: ih * 0.82 }, { x: m, y: H - m - s0.h, w: s0.w, h: s0.h }], { overlap: true, luxe: true });
    }
    {
      // jedno zdjęcie w szerokim passe-partout, przesunięte optycznie ku górze
      const f = fit(2 / 3, iw * 0.7, ih * 0.8);
      add("gallery-port", [{ x: (W - f.w) / 2, y: (H - f.h) * 0.42, w: f.w, h: f.h }], { luxe: true });
    }
    {
      const f = fit(1.5, iw * 0.9, ih * 0.7);
      add("gallery-land", [{ x: (W - f.w) / 2, y: (H - f.h) * 0.42, w: f.w, h: f.h }], { luxe: true });
    }
    {
      // dwa zdjęcia „schodkowo”: jedno wyżej z lewej, drugie niżej z prawej
      const w = (iw - g) * 0.5;
      const h = Math.min(ih * 0.68, w * 1.5);
      add("stagger", [{ x: m, y: m, w, h }, { x: m + w + g, y: H - m - h, w, h }], { asym: true, luxe: true });
    }
  }
  return t;
}

// Układy na całą rozkładówkę (ponad grzbietem) – tylko dla stylu luksusowego.
// Liczone na rozkładówce 2r × 1 i przeliczane na współrzędne rozkładówki (0–2).
function spreadTemplates(style: AlbumStyle, r: number): PageTpl[] {
  if (style !== "atelier") return [];
  const cfg = STYLES[style];
  const W = 2 * r;
  const H = 1;
  const base = Math.min(r, 1);
  const m = cfg.m * base;
  const g = cfg.g * base;
  const t: PageTpl[] = [];
  const add = (name: string, frames: Frame[], extra: Partial<PageTpl> = {}) =>
    t.push({ name: `S:${name}`, frames: frames.map((f) => ({ x: f.x / r, y: f.y, w: f.w / r, h: f.h })), luxe: true, ...extra });
  {
    // szerokie zdjęcie na lewej stronie i kawałku prawej + pionowe nachodzące z prawej
    const bw = r * 1.32;
    const bh = H - 2 * m * 1.4;
    const pw = Math.min(r * 0.55, (H - 2 * m) / 1.5);
    const ph = pw * 1.5;
    add("hero-overlap", [{ x: m * 1.2, y: (H - bh) / 2, w: bw, h: bh }, { x: W - m * 1.6 - pw, y: (H - ph) / 2 + m * 0.4, w: pw, h: ph }], { overlap: true });
  }
  {
    // trzy pionowe kadry w rytmie: duży w środku lewej strony, dwa mniejsze na prawej na różnych wysokościach
    const bigH = H - 2 * m;
    const bigW = Math.min(r - 2 * m, bigH / 1.5);
    const sw = Math.min((r - 2 * m - g) / 2, (H - 2 * m) * 0.5);
    const sh = sw * 1.5;
    add("rhythm-3", [
      { x: (r - bigW) / 2, y: m, w: bigW, h: bigH },
      { x: r + m, y: m, w: sw, h: sh },
      { x: W - m - sw, y: H - m - sh, w: sw, h: sh },
    ]);
  }
  {
    // panorama z ramką + mała pionowa „wklejka”
    const ph = H - 2 * m * 1.6;
    const pw = W - 2 * m * 1.6;
    const iw0 = Math.min(r * 0.36, (H - 2 * m) * 0.45);
    const ih0 = iw0 * 1.5;
    add("pano-card", [{ x: (W - pw) / 2, y: (H - ph) / 2, w: pw, h: ph }, { x: W - m * 2.6 - iw0, y: H - m * 2.2 - ih0, w: iw0, h: ih0 }], { overlap: true });
  }
  return t;
}

// ===== Losowość powtarzalna (ten sam seed = ten sam album) =====

export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

// Ile trzeba przyciąć zdjęcie, żeby wypełniło ramkę (r – proporcje strony)
const cropCost = (frame: Frame, photoAspect: number, r: number) => Math.abs(Math.log((frame.w * r) / frame.h / photoAspect));

function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  const out: T[][] = [];
  arr.forEach((v, i) => {
    for (const p of permutations([...arr.slice(0, i), ...arr.slice(i + 1)])) out.push([v, ...p]);
  });
  return out;
}

type Candidate = { slots: Slot[]; cost: number; key: string };

// Najlepsze przypisanie zdjęć do ramek strony (z przesunięciem x dla prawej strony)
function fitPage(tpl: PageTpl, photos: string[], aspects: Record<string, number>, dx: number, r: number): { slots: Slot[]; cost: number } {
  let best: { slots: Slot[]; cost: number } | null = null;
  for (const perm of permutations(photos)) {
    let cost = 0;
    const slots = tpl.frames.map((f, i) => {
      cost += cropCost(f, aspects[perm[i]] ?? 1.5, r);
      return { photo: perm[i], frame: { ...f, x: f.x + dx }, ...(tpl.overlap && i > 0 ? { layer: 1 } : {}) };
    });
    // lekka preferencja zachowania kolejności
    if (perm.join() !== photos.join()) cost += 0.02;
    if (!best || cost < best.cost) best = { slots, cost };
  }
  return best!;
}

// Wszystkie sensowne układy rozkładówki dla danych zdjęć, od najlepszego
export function spreadCandidates(photos: string[], aspects: Record<string, number>, style: AlbumStyle, rand: () => number = () => 0.5, r = 1): Candidate[] {
  const cfg = STYLES[style];
  const tpls = pageTemplates(style, r);
  const out: Candidate[] = [];
  const n = photos.length;
  // Zdjęcia na spad: w stylu „Magazyn” chętnie (mimo przycięcia), w minimalistycznym rzadko
  const bias = (tpl: PageTpl) =>
    (tpl.bleed ? 0.3 - cfg.bleed * 1.4 : 0) +
    (tpl.asym ? (style === "editorial" || style === "atelier" ? -0.05 : 0.12) : 0) +
    (tpl.luxe ? (style === "atelier" ? -0.12 : 0.04) : 0);

  if (n === 1) {
    const a = aspects[photos[0]] ?? 1.5;
    const m = cfg.m * Math.min(r, 1);
    if (a > 1.1 && cfg.pano) {
      out.push({ key: "pano", cost: cropCost({ x: 0, y: 0, w: 2, h: 1 }, a, r) * 0.6 - 0.05, slots: [{ photo: photos[0], frame: { x: 0, y: 0, w: 2, h: 1 } }] });
      // panorama z marginesem (w jednostkach fizycznych: rozkładówka 2r × 1)
      const h = 1 - 2 * m;
      const wPhys = Math.min(2 * r - 2 * m, h * 1.85);
      const w = wPhys / r;
      out.push({ key: "pano-inset", cost: cropCost({ x: 0, y: 0, w, h }, a, r) * 0.6, slots: [{ photo: photos[0], frame: { x: (2 - w) / 2, y: m, w, h } }] });
    }
    // jedno zdjęcie na prawej stronie, lewa pusta (elegancki oddech)
    for (const tpl of tpls.filter((t) => t.frames.length === 1)) {
      const p = fitPage(tpl, photos, aspects, 1, r);
      out.push({ key: `R:${tpl.name}`, cost: p.cost + bias(tpl) + 0.1, slots: p.slots });
    }
  } else {
    for (let left = 1; left <= Math.min(4, n - 1); left++) {
      const right = n - left;
      if (right > 4) continue;
      const lp = photos.slice(0, left);
      const rp = photos.slice(left);
      const lt = tpls.filter((t) => t.frames.length === left);
      const rt = tpls.filter((t) => t.frames.length === right);
      for (const a of lt) {
        for (const b of rt) {
          const L = fitPage(a, lp, aspects, 0, r);
          const R = fitPage(b, rp, aspects, 1, r);
          // różne układy po obu stronach wyglądają ciekawiej; nierówny podział lekko karany
          const cost =
            L.cost + R.cost + bias(a) + bias(b) +
            (a.name === b.name && left > 1 ? 0.05 : 0) +
            (a.bleed && b.bleed ? 0.45 : 0) + // dwie strony na spad naraz to za dużo
            Math.abs(left - right) * 0.04;
          out.push({ key: `${a.name}|${b.name}`, cost, slots: [...L.slots, ...R.slots] });
        }
      }
    }
  }
  // układy na całą rozkładówkę
  for (const tpl of spreadTemplates(style, r).filter((t) => t.frames.length === n)) {
    const p = fitPage(tpl, photos, aspects, 0, r);
    out.push({ key: tpl.name, cost: p.cost + bias(tpl) - 0.04, slots: p.slots });
  }
  // drobny losowy szum, żeby albumy nie były identyczne
  for (const c of out) c.cost += rand() * 0.06;
  return out.sort((x, y) => x.cost - y.cost);
}

let uid = 0;
const newId = () => `s${Date.now().toString(36)}${(uid++).toString(36)}`;

// Układ jednej rozkładówki (variant = numer kolejnej propozycji)
export function layoutSpread(photos: string[], aspects: Record<string, number>, style: AlbumStyle, variant = 0, seed = 1, r = 1): Spread {
  const cands = spreadCandidates(photos, aspects, style, rng(seed), r);
  const pick = cands[((variant % cands.length) + cands.length) % cands.length];
  return { id: newId(), kind: "photos", slots: pick.slots, variant };
}

export const PAGE_OPTIONS = Array.from({ length: 21 }, (_, i) => 20 + i * 2); // 20, 22 … 60
export const MAX_PER_SPREAD = 8;

// Ile zdjęć na kolejnych rozkładówkach, żeby wszystkie zmieściły się dokładnie w `count` rozkładówkach.
// Rytm stylu (np. 1–3–1–4) zostaje zachowany, tylko przeskalowany.
function distribute(total: number, count: number, cfg: StyleCfg, rand: () => number): number[] {
  const r0 = Math.floor(rand() * cfg.rhythm.length);
  const w = Array.from({ length: count }, (_, i) => cfg.rhythm[(r0 + 2 * i) % cfg.rhythm.length] + cfg.rhythm[(r0 + 2 * i + 1) % cfg.rhythm.length]);
  const sum = w.reduce((a, b) => a + b, 0);
  const exact = w.map((x) => (x / sum) * total);
  const n = exact.map((x) => Math.min(MAX_PER_SPREAD, Math.max(1, Math.floor(x))));
  let left = total - n.reduce((a, b) => a + b, 0);
  // reszta tam, gdzie zaokrąglenie zabrało najwięcej
  const order = exact.map((x, i) => ({ i, f: x - Math.floor(x) })).sort((a, b) => b.f - a.f);
  for (let k = 0; left > 0 && k < order.length * MAX_PER_SPREAD; k++) {
    const i = order[k % order.length].i;
    if (n[i] < MAX_PER_SPREAD) {
      n[i]++;
      left--;
    }
  }
  for (let k = 0; left < 0 && k < order.length * MAX_PER_SPREAD; k++) {
    const i = order[order.length - 1 - (k % order.length)].i;
    if (n[i] > 1) {
      n[i]--;
      left++;
    }
  }
  return n;
}

// Ile stron najmniej i najwięcej potrzeba na daną liczbę zdjęć (z tytułową lub bez)
export function pageRange(photoCount: number, titlePage: boolean) {
  const extra = titlePage ? 1 : 0;
  return { min: (Math.ceil(photoCount / MAX_PER_SPREAD) + extra) * 2, max: (photoCount + extra) * 2 };
}

// Cały album z listy zdjęć (w kolejności wyboru klienta). pages – docelowa liczba stron (np. 20–60)
export function generateAlbum(photos: string[], aspects: Record<string, number>, style: AlbumStyle, seed: number, titlePage: boolean, pages?: number | null, r = 1): Spread[] {
  const cfg = STYLES[style];
  const rand = rng(seed);
  const spreads: Spread[] = [];
  // tło strony tytułowej: pierwsze zdjęcie albumu (widoczne przy rozmytym tle)
  if (titlePage) spreads.push({ id: newId(), kind: "title", slots: [], variant: 0, bgPhoto: photos[0] });

  if (pages && photos.length) {
    const want = Math.floor(pages / 2) - (titlePage ? 1 : 0);
    // za mało stron na wszystkie zdjęcia (max 8 na rozkładówkę) – album wyjdzie dłuższy; za dużo – krótszy
    const count = Math.max(Math.ceil(photos.length / MAX_PER_SPREAD), Math.min(photos.length, want), 1);
    const sizes = distribute(photos.length, count, cfg, rand);
    let i = 0;
    let lastKey = "";
    for (const n of sizes) {
      const group = photos.slice(i, i + n);
      i += n;
      if (!group.length) continue;
      const cands = spreadCandidates(group, aspects, style, rand, r);
      const pick = cands.find((c) => c.key !== lastKey) ?? cands[0];
      lastKey = pick.key;
      spreads.push({ id: newId(), kind: "photos", slots: pick.slots, variant: cands.indexOf(pick) });
    }
    return spreads;
  }

  let i = 0;
  let rh = Math.floor(rand() * cfg.rhythm.length);
  let lastKey = "";
  while (i < photos.length) {
    const left = photos.length - i;
    // panorama co kilka rozkładówek, gdy następne zdjęcie jest poziome
    const a = aspects[photos[i]] ?? 1.5;
    if (cfg.pano && spreads.length > 0 && spreads.length % cfg.pano === 1 && a > 1.25 && rand() < 0.8) {
      const s = layoutSpread([photos[i]], aspects, style, 0, seed + i, r);
      spreads.push(s);
      i += 1;
      continue;
    }
    let n = cfg.rhythm[rh % cfg.rhythm.length] + cfg.rhythm[(rh + 1) % cfg.rhythm.length];
    rh += 2;
    n = Math.min(n, left);
    // nie zostawiamy na koniec pojedynczej sieroty, jeśli da się ją dołączyć
    if (left - n === 1 && n < 8) n += 1;
    const group = photos.slice(i, i + n);
    const cands = spreadCandidates(group, aspects, style, rand, r);
    // unikamy powtórzenia tego samego układu pod rząd
    const pick = cands.find((c) => c.key !== lastKey) ?? cands[0];
    lastKey = pick.key;
    spreads.push({ id: newId(), kind: "photos", slots: pick.slots, variant: cands.indexOf(pick) });
    i += n;
  }
  return spreads;
}

export function usedPhotos(spreads: Spread[]) {
  return new Set(spreads.flatMap((s) => s.slots.map((x) => x.photo)));
}

// Czy ramka dotyka krawędzi (wtedy przy druku wychodzi na spad)
export function touches(f: Frame) {
  const e = 0.0005;
  return { left: f.x <= e, top: f.y <= e, right: f.x + f.w >= 2 - e, bottom: f.y + f.h >= 1 - e };
}

export function emptyProject(source: string, title: string, subtitle: string): AlbumProject {
  return {
    size: "20x20",
    style: "atelier",
    bg: "blur-light",
    frame: "white",
    source,
    title,
    subtitle,
    titlePage: true,
    bleed: true,
    spreads: [],
    aspects: {},
    seed: Math.floor(Math.random() * 1e9),
  };
}
