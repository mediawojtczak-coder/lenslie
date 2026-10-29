// Projektor albumów: automatyczny układ rozkładówek (wspólny dla panelu i generowania plików).
// Współrzędne rozkładówki: szerokość 2 (dwie kwadratowe strony), wysokość 1. Lewa strona x 0–1, prawa 1–2.

export type AlbumSize = 15 | 20 | 25;
export type AlbumStyle = "minimal" | "editorial" | "classic";
export type AlbumBg = "white" | "ivory" | "black";

export type Frame = { x: number; y: number; w: number; h: number };
// fx, fy – punkt kadru (0–1), gdy zdjęcie jest przycięte; domyślnie środek
export type Slot = { photo: string; frame: Frame; fx?: number; fy?: number };
export type Spread = {
  id: string;
  kind: "photos" | "title";
  slots: Slot[];
  variant: number; // który z możliwych układów (przycisk „Zmień układ”)
};

export type AlbumProject = {
  size: AlbumSize;
  style: AlbumStyle;
  bg: AlbumBg;
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

export const ALBUM_SIZES: AlbumSize[] = [15, 20, 25];
export const ALBUM_STYLES: AlbumStyle[] = ["minimal", "editorial", "classic"];

export const BG_COLORS: Record<AlbumBg, { bg: string; ink: string; muted: string }> = {
  white: { bg: "#ffffff", ink: "#2b2724", muted: "#8f8781" },
  ivory: { bg: "#f7f3ec", ink: "#2b2724", muted: "#8f8781" },
  black: { bg: "#151413", ink: "#f2ede6", muted: "#a59d95" },
};

type StyleCfg = {
  m: number; // margines strony (część boku)
  g: number; // odstęp między zdjęciami
  bleed: number; // skłonność do zdjęć na spad (0–1)
  pano: number; // co która rozkładówka może być panoramą (0 = nigdy)
  rhythm: number[]; // ile zdjęć na kolejnych stronach
};

const STYLES: Record<AlbumStyle, StyleCfg> = {
  // Dużo powietrza, pojedyncze zdjęcia w passe-partout
  minimal: { m: 0.13, g: 0.04, bleed: 0.08, pano: 0, rhythm: [1, 1, 2, 1, 1, 2, 1, 3] },
  // Magazynowy: zdjęcia na spad, panoramy, asymetria
  editorial: { m: 0.09, g: 0.028, bleed: 0.55, pano: 4, rhythm: [1, 3, 1, 2, 1, 4, 2, 1] },
  // Klasyczny album ślubny: równe marginesy, siatki
  classic: { m: 0.075, g: 0.03, bleed: 0.2, pano: 6, rhythm: [2, 1, 2, 3, 1, 2, 4, 1] },
};

// ===== Szablony stron (kwadrat 1×1) =====

type PageTpl = { name: string; frames: Frame[]; bleed?: boolean; asym?: boolean };

function pageTemplates(style: AlbumStyle): PageTpl[] {
  const { m, g } = STYLES[style];
  const inner = 1 - 2 * m;
  const t: PageTpl[] = [];
  const c = (w: number, h: number): Frame => ({ x: (1 - w) / 2, y: (1 - h) / 2, w, h });

  // 1 zdjęcie
  t.push({ name: "full", frames: [{ x: 0, y: 0, w: 1, h: 1 }], bleed: true });
  t.push({ name: "land", frames: [c(inner, inner / 1.5)] });
  t.push({ name: "port", frames: [c(inner / 1.5, inner)] });
  t.push({ name: "square", frames: [c(inner * 0.78, inner * 0.78)] });
  t.push({ name: "port-small", frames: [{ x: m * 1.4, y: m * 1.6, w: inner * 0.5, h: inner * 0.75 }], asym: true });
  t.push({ name: "land-low", frames: [{ x: m, y: 1 - m * 1.3 - inner * 0.55, w: inner * 0.82, h: inner * 0.55 }], asym: true });

  // 2 zdjęcia
  {
    const w = (inner - g) / 2;
    const h = Math.min(inner, w * 1.5);
    t.push({ name: "two-port", frames: [{ x: m, y: (1 - h) / 2, w, h }, { x: m + w + g, y: (1 - h) / 2, w, h }] });
  }
  {
    const h = (inner - g) / 2;
    const w = Math.min(inner, h * 1.5);
    t.push({ name: "two-land", frames: [{ x: (1 - w) / 2, y: m, w, h }, { x: (1 - w) / 2, y: m + h + g, w, h }] });
  }
  {
    // duże pionowe + małe kwadratowe (asymetria)
    const bw = inner * 0.6;
    const sw = inner - bw - g;
    t.push({
      name: "two-mixed",
      frames: [
        { x: m, y: m, w: bw, h: inner },
        { x: m + bw + g, y: m + inner - sw * 1.25, w: sw, h: sw * 1.25 },
      ],
      asym: true,
    });
  }
  // dwa na spad (pionowe połówki)
  t.push({ name: "two-bleed", frames: [{ x: 0, y: 0, w: 0.5 - g / 2, h: 1 }, { x: 0.5 + g / 2, y: 0, w: 0.5 - g / 2, h: 1 }], bleed: true });

  // 3 zdjęcia
  {
    const lw = (inner - g) * 0.5;
    const rw = inner - g - lw;
    const rh = (inner - g) / 2;
    t.push({
      name: "three-left",
      frames: [
        { x: m, y: m, w: lw, h: inner },
        { x: m + lw + g, y: m, w: rw, h: rh },
        { x: m + lw + g, y: m + rh + g, w: rw, h: rh },
      ],
    });
  }
  {
    const th = (inner - g) * 0.55;
    const bw = (inner - g) / 2;
    const bh = inner - g - th;
    t.push({
      name: "three-top",
      frames: [
        { x: m, y: m, w: inner, h: th },
        { x: m, y: m + th + g, w: bw, h: bh },
        { x: m + bw + g, y: m + th + g, w: bw, h: bh },
      ],
    });
  }
  {
    const w = (inner - 2 * g) / 3;
    const h = Math.min(inner, w * 1.5);
    t.push({
      name: "three-row",
      frames: [0, 1, 2].map((i) => ({ x: m + i * (w + g), y: (1 - h) / 2, w, h })),
    });
  }

  // 4 zdjęcia
  {
    const s = (inner - g) / 2;
    t.push({
      name: "four",
      frames: [
        { x: m, y: m, w: s, h: s },
        { x: m + s + g, y: m, w: s, h: s },
        { x: m, y: m + s + g, w: s, h: s },
        { x: m + s + g, y: m + s + g, w: s, h: s },
      ],
    });
  }
  {
    const bh = (inner - g) * 0.62;
    const sw = (inner - 2 * g) / 3;
    const sh = inner - g - bh;
    t.push({
      name: "four-strip",
      frames: [{ x: m, y: m, w: inner, h: bh }, ...[0, 1, 2].map((i) => ({ x: m + i * (sw + g), y: m + bh + g, w: sw, h: sh }))],
    });
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

const aspectOf = (f: Frame) => f.w / f.h;
const cropCost = (frame: Frame, photoAspect: number) => Math.abs(Math.log(aspectOf(frame) / photoAspect));

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
function fitPage(tpl: PageTpl, photos: string[], aspects: Record<string, number>, dx: number): { slots: Slot[]; cost: number } {
  let best: { slots: Slot[]; cost: number } | null = null;
  for (const perm of permutations(photos)) {
    let cost = 0;
    const slots = tpl.frames.map((f, i) => {
      cost += cropCost(f, aspects[perm[i]] ?? 1.5);
      return { photo: perm[i], frame: { ...f, x: f.x + dx } };
    });
    // lekka preferencja zachowania kolejności
    if (perm.join() !== photos.join()) cost += 0.02;
    if (!best || cost < best.cost) best = { slots, cost };
  }
  return best!;
}

// Wszystkie sensowne układy rozkładówki dla danych zdjęć, od najlepszego
export function spreadCandidates(photos: string[], aspects: Record<string, number>, style: AlbumStyle, rand: () => number = () => 0.5): Candidate[] {
  const cfg = STYLES[style];
  const tpls = pageTemplates(style);
  const out: Candidate[] = [];
  const n = photos.length;
  // Zdjęcia na spad: w stylu „Magazyn” chętnie (mimo przycięcia), w minimalistycznym rzadko
  const bias = (tpl: PageTpl) => (tpl.bleed ? 0.3 - cfg.bleed * 1.4 : 0) + (tpl.asym ? (style === "editorial" ? -0.05 : 0.12) : 0);

  if (n === 1) {
    const a = aspects[photos[0]] ?? 1.5;
    const { m } = cfg;
    if (a > 1.1 && cfg.pano) {
      out.push({ key: "pano", cost: cropCost({ x: 0, y: 0, w: 2, h: 1 }, a) * 0.6 - 0.05, slots: [{ photo: photos[0], frame: { x: 0, y: 0, w: 2, h: 1 } }] });
      const h = 1 - 2 * m;
      const w = Math.min(2 - 2 * m, h * 1.85);
      out.push({ key: "pano-inset", cost: cropCost({ x: 0, y: 0, w, h }, a) * 0.6, slots: [{ photo: photos[0], frame: { x: (2 - w) / 2, y: m, w, h } }] });
    }
    // jedno zdjęcie na prawej stronie, lewa pusta (elegancki oddech)
    for (const tpl of tpls.filter((t) => t.frames.length === 1)) {
      const p = fitPage(tpl, photos, aspects, 1);
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
          const L = fitPage(a, lp, aspects, 0);
          const R = fitPage(b, rp, aspects, 1);
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
  // drobny losowy szum, żeby albumy nie były identyczne
  for (const c of out) c.cost += rand() * 0.06;
  return out.sort((x, y) => x.cost - y.cost);
}

let uid = 0;
const newId = () => `s${Date.now().toString(36)}${(uid++).toString(36)}`;

// Układ jednej rozkładówki (variant = numer kolejnej propozycji)
export function layoutSpread(photos: string[], aspects: Record<string, number>, style: AlbumStyle, variant = 0, seed = 1): Spread {
  const cands = spreadCandidates(photos, aspects, style, rng(seed));
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
export function generateAlbum(photos: string[], aspects: Record<string, number>, style: AlbumStyle, seed: number, titlePage: boolean, pages?: number | null): Spread[] {
  const cfg = STYLES[style];
  const rand = rng(seed);
  const spreads: Spread[] = [];
  if (titlePage) spreads.push({ id: newId(), kind: "title", slots: [], variant: 0 });

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
      const cands = spreadCandidates(group, aspects, style, rand);
      const pick = cands.find((c) => c.key !== lastKey) ?? cands[0];
      lastKey = pick.key;
      spreads.push({ id: newId(), kind: "photos", slots: pick.slots, variant: cands.indexOf(pick) });
    }
    return spreads;
  }

  let i = 0;
  let r = Math.floor(rand() * cfg.rhythm.length);
  let lastKey = "";
  while (i < photos.length) {
    const left = photos.length - i;
    // panorama co kilka rozkładówek, gdy następne zdjęcie jest poziome
    const a = aspects[photos[i]] ?? 1.5;
    if (cfg.pano && spreads.length > 0 && spreads.length % cfg.pano === 1 && a > 1.25 && rand() < 0.8) {
      const s = layoutSpread([photos[i]], aspects, style, 0, seed + i);
      spreads.push(s);
      i += 1;
      continue;
    }
    let n = cfg.rhythm[r % cfg.rhythm.length] + cfg.rhythm[(r + 1) % cfg.rhythm.length];
    r += 2;
    n = Math.min(n, left);
    // nie zostawiamy na koniec pojedynczej sieroty, jeśli da się ją dołączyć
    if (left - n === 1 && n < 8) n += 1;
    const group = photos.slice(i, i + n);
    const cands = spreadCandidates(group, aspects, style, rand);
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
    size: 20,
    style: "editorial",
    bg: "ivory",
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
