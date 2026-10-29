// Projektor albumów: rozkładówki do druku (JPEG 300 dpi, sRGB, opcjonalnie 3 mm spadu) – generowane w przeglądarce fotografa
import { BG_COLORS, touches, albumFormat, isBlurBg, backgroundPhoto, type AlbumProject, type Spread } from "@/lib/album-layout";

export const DPI = 300;
export const BLEED_CM = 0.3;

const pxPerCm = DPI / 2.54;

export function spreadPixels(p: Pick<AlbumProject, "size" | "bleed">) {
  const b = p.bleed ? BLEED_CM : 0;
  const f = albumFormat(p.size);
  return {
    width: Math.round((f.w * 2 + b * 2) * pxPerCm),
    height: Math.round((f.h + b * 2) * pxPerCm),
    ux: f.w * pxPerCm, // piksele na 1 jednostkę w poziomie (= szerokość strony)
    uy: f.h * pxPerCm, // piksele na 1 jednostkę w pionie (= wysokość strony)
    bleed: Math.round(b * pxPerCm),
  };
}

type Img = CanvasImageSource & { width: number; height: number };

// Rysuje zdjęcie przycięte do ramki (jak object-fit: cover) z punktem kadru fx/fy
function drawCover(ctx: CanvasRenderingContext2D, img: Img, x: number, y: number, w: number, h: number, fx = 0.5, fy = 0.5) {
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (img.width - sw) * fx;
  const sy = (img.height - sh) * fy;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function displayFont() {
  if (typeof document === "undefined") return "Georgia, serif";
  const probe = document.createElement("span");
  probe.style.fontFamily = "var(--font-display), Georgia, serif";
  document.body.appendChild(probe);
  const fam = getComputedStyle(probe).fontFamily || "Georgia, serif";
  probe.remove();
  return fam;
}

export function monogram(title: string) {
  const words = title.split(/[\s&+,-]+/).filter((w) => /\p{L}/u.test(w));
  return words.slice(0, 2).map((w) => w[0]!.toUpperCase()).join(words.length > 1 ? " & " : "");
}

// Strona tytułowa: na prawej stronie monogram w cienkim kole, imiona i data
function drawTitle(ctx: CanvasRenderingContext2D, p: AlbumProject, ux: number, uy: number, off: number, font: string) {
  const c = BG_COLORS[p.bg];
  const cx = off + ux * 1.5;
  const cy = off + uy * 0.5;
  const unit = Math.min(ux, uy);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const line = Math.max(1, unit * 0.0011);

  // monogram
  const mono = monogram(p.title);
  if (mono) {
    const r = unit * 0.075;
    const my = cy - unit * 0.13;
    ctx.strokeStyle = c.muted;
    ctx.lineWidth = line;
    ctx.beginPath();
    ctx.arc(cx, my, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, my, r * 0.9, 0, Math.PI * 2);
    ctx.globalAlpha = 0.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = c.ink;
    ctx.font = `italic 400 ${r * (mono.length > 2 ? 0.62 : 0.9)}px ${font}`;
    ctx.fillText(mono, cx, my + r * 0.04);
  }

  ctx.fillStyle = c.ink;
  let size = unit * 0.075;
  ctx.font = `400 ${size}px ${font}`;
  while (ctx.measureText(p.title || " ").width > unit * 0.8 && size > unit * 0.03) {
    size *= 0.92;
    ctx.font = `400 ${size}px ${font}`;
  }
  ctx.fillText(p.title || "", cx, cy + unit * 0.02);
  ctx.strokeStyle = c.muted;
  ctx.lineWidth = line;
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + dir * unit * 0.018, cy + unit * 0.085);
    ctx.lineTo(cx + dir * unit * 0.075, cy + unit * 0.085);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(cx, cy + unit * 0.085, unit * 0.003, 0, Math.PI * 2);
  ctx.fillStyle = c.muted;
  ctx.fill();
  if (p.subtitle) {
    const s0 = unit * 0.02;
    ctx.font = `400 ${s0}px ${font}`;
    const text = p.subtitle.toUpperCase().split("").join(String.fromCharCode(8202, 8202));
    ctx.fillText(text, cx, cy + unit * 0.135);
  }
}

// Rozmyte, rozjaśnione (albo przyciemnione) zdjęcie na całe tło rozkładówki.
// Rozmycie przez zmniejszenie i powiększenie – działa w każdej przeglądarce.
function drawBlurBackground(ctx: CanvasRenderingContext2D, img: Img, W: number, H: number, wash: string) {
  const small = document.createElement("canvas");
  const k = 40 / Math.max(W, H);
  small.width = Math.max(4, Math.round(W * k));
  small.height = Math.max(4, Math.round(H * k));
  const sctx = small.getContext("2d")!;
  sctx.imageSmoothingQuality = "high";
  drawCover(sctx, img, 0, 0, small.width, small.height, 0.5, 0.5);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(small, 0, 0, small.width, small.height, 0, 0, W, H);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// Rysuje rozkładówkę na płótnie. getImage zwraca wczytane zdjęcie (albo null – wtedy szare pole)
export async function drawSpread(
  canvas: HTMLCanvasElement,
  spread: Spread,
  p: AlbumProject,
  getImage: (name: string) => Promise<Img | null>,
  dims = spreadPixels(p),
) {
  canvas.width = dims.width;
  canvas.height = dims.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  const colors = BG_COLORS[p.bg];
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, dims.width, dims.height);
  const off = dims.bleed;
  const ux = dims.ux;
  const uy = dims.uy;
  const unit = Math.min(ux, uy);

  if (isBlurBg(p.bg) && colors.wash) {
    const bgName = backgroundPhoto(spread);
    const img = bgName ? await getImage(bgName) : null;
    if (img) drawBlurBackground(ctx, img, dims.width, dims.height, colors.wash);
  }

  if (spread.kind === "title") {
    drawTitle(ctx, p, ux, uy, off, displayFont());
    return;
  }

  const frame = p.frame ?? "none";
  const border = frame === "white" ? Math.max(2, Math.round(unit * 0.0075)) : 0;
  const slots = [...spread.slots].sort((a, b) => (a.layer ?? 0) - (b.layer ?? 0));
  for (const s of slots) {
    const t = touches(s.frame);
    const edge = t.left || t.top || t.right || t.bottom;
    // zdjęcia przy krawędzi wychodzą na spad
    const x0 = off + s.frame.x * ux - (t.left ? off : 0);
    const y0 = off + s.frame.y * uy - (t.top ? off : 0);
    const x1 = off + (s.frame.x + s.frame.w) * ux + (t.right ? off : 0);
    const y1 = off + (s.frame.y + s.frame.h) * uy + (t.bottom ? off : 0);
    const X = Math.round(x0);
    const Y = Math.round(y0);
    const Wd = Math.round(x1 - x0);
    const Ht = Math.round(y1 - y0);

    // biała ramka jak przy odbitce, z miękkim cieniem (nie dla zdjęć na spad)
    const framed = frame === "white" && !edge;
    const shadow = !edge && (framed || (s.layer ?? 0) > 0 || isBlurBg(p.bg));
    if (shadow) {
      ctx.save();
      ctx.shadowColor = p.bg === "blur-dark" || p.bg === "black" ? "rgba(0,0,0,0.55)" : "rgba(40,30,20,0.28)";
      ctx.shadowBlur = unit * 0.03;
      ctx.shadowOffsetY = unit * 0.008;
      ctx.fillStyle = framed ? "#fbfaf8" : "#ddd";
      ctx.fillRect(X - border, Y - border, Wd + 2 * border, Ht + 2 * border);
      ctx.restore();
    } else if (framed) {
      ctx.fillStyle = "#fbfaf8";
      ctx.fillRect(X - border, Y - border, Wd + 2 * border, Ht + 2 * border);
    }

    const img = await getImage(s.photo);
    if (img) drawCover(ctx, img, X, Y, Wd, Ht, s.fx ?? 0.5, s.fy ?? 0.45);
    else {
      ctx.fillStyle = "#d9d3cc";
      ctx.fillRect(X, Y, Wd, Ht);
    }

    // cienka linia w kolorze tekstu, odsunięta od zdjęcia
    if (frame === "line" && !edge) {
      const gap = Math.round(unit * 0.008);
      ctx.strokeStyle = colors.muted;
      ctx.lineWidth = Math.max(1, unit * 0.0011);
      ctx.strokeRect(X - gap, Y - gap, Wd + 2 * gap, Ht + 2 * gap);
    }
  }
}

// Ustawia w nagłówku JPEG rozdzielczość 300 dpi (drukarnie czytają ją przy przyjmowaniu plików)
async function withDpi(blob: Blob): Promise<Blob> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  const isJfif = buf[2] === 0xff && buf[3] === 0xe0 && String.fromCharCode(buf[6], buf[7], buf[8], buf[9]) === "JFIF";
  if (isJfif) {
    buf[13] = 1; // jednostki: cale
    buf[14] = DPI >> 8;
    buf[15] = DPI & 0xff;
    buf[16] = DPI >> 8;
    buf[17] = DPI & 0xff;
  }
  return new Blob([buf], { type: "image/jpeg" });
}

function toJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("jpeg"))), "image/jpeg", 0.93),
  );
}

async function loadBitmap(url: string): Promise<ImageBitmap> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("img");
  return createImageBitmap(await res.blob(), { imageOrientation: "from-image" });
}

const pad = (n: number) => String(n).padStart(2, "0");

// Wszystkie rozkładówki do plików JPEG w ZIP-ie. urls: nazwa zdjęcia -> oryginał
export async function exportAlbum(
  p: AlbumProject,
  urls: Record<string, string>,
  fallbackUrls: Record<string, string>,
  onProgress: (done: number, total: number) => void,
  name: string,
): Promise<Blob> {
  const { downloadZip } = await import("client-zip");
  const canvas = document.createElement("canvas");
  const dims = spreadPixels(p);
  const fmt = albumFormat(p.size);
  const files: { name: string; input: Blob }[] = [];
  const total = p.spreads.length;
  for (let i = 0; i < total; i++) {
    const spread = p.spreads[i];
    const cache = new Map<string, ImageBitmap>();
    await drawSpread(
      canvas,
      spread,
      p,
      async (photo) => {
        if (cache.has(photo)) return cache.get(photo)!;
        const url = urls[photo] ?? fallbackUrls[photo];
        if (!url) return null;
        const bmp = await loadBitmap(url).catch(() => (fallbackUrls[photo] && url !== fallbackUrls[photo] ? loadBitmap(fallbackUrls[photo]) : null));
        if (bmp) cache.set(photo, bmp);
        return bmp;
      },
      dims,
    );
    cache.forEach((b) => b.close());
    files.push({ name: `${name}-${fmt.id}-${pad(i + 1)}.jpg`, input: await withDpi(await toJpeg(canvas)) });
    onProgress(i + 1, total);
  }
  const b = p.bleed ? `, ze spadem ${BLEED_CM * 10} mm z każdej strony` : ", bez spadu";
  const info = [
    `Album ${fmt.w}×${fmt.h} cm – ${total} rozkładówek (${total * 2} stron).`,
    `Każdy plik to rozkładówka ${fmt.w * 2}×${fmt.h} cm${b}: ${dims.width}×${dims.height} px, ${DPI} dpi, sRGB, JPEG.`,
    p.bleed ? "Spad zostanie obcięty w drukarni – nie umieszczaj ważnych elementów przy samej krawędzi." : "",
    "Przygotowano w Lenslie – www.lenslie.com",
  ]
    .filter(Boolean)
    .join("\r\n");
  files.push({ name: "informacje.txt", input: new Blob([info], { type: "text/plain" }) });
  return downloadZip(files).blob();
}
