// Projektor albumów: rozkładówki do druku (JPEG 300 dpi, sRGB, opcjonalnie 3 mm spadu) – generowane w przeglądarce fotografa
import { BG_COLORS, touches, albumFormat, type AlbumProject, type Spread } from "@/lib/album-layout";

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

// Strona tytułowa: lewa strona pusta, na prawej imiona i data
function drawTitle(ctx: CanvasRenderingContext2D, p: AlbumProject, ux: number, uy: number, off: number, font: string) {
  const c = BG_COLORS[p.bg];
  const cx = off + ux * 1.5;
  const cy = off + uy * 0.5;
  const unit = Math.min(ux, uy);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = c.ink;
  let size = unit * 0.085;
  ctx.font = `400 ${size}px ${font}`;
  while (ctx.measureText(p.title || " ").width > unit * 0.78 && size > unit * 0.03) {
    size *= 0.92;
    ctx.font = `400 ${size}px ${font}`;
  }
  ctx.fillText(p.title || "", cx, cy - unit * 0.035);
  ctx.strokeStyle = c.muted;
  ctx.lineWidth = Math.max(1, unit * 0.0012);
  ctx.beginPath();
  ctx.moveTo(cx - unit * 0.05, cy + unit * 0.035);
  ctx.lineTo(cx + unit * 0.05, cy + unit * 0.035);
  ctx.stroke();
  if (p.subtitle) {
    ctx.fillStyle = c.muted;
    const s = unit * 0.022;
    ctx.font = `400 ${s}px ${font}`;
    const text = p.subtitle.toUpperCase().split("").join(String.fromCharCode(8202));
    ctx.fillText(text, cx, cy + unit * 0.085);
  }
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

  if (spread.kind === "title") {
    drawTitle(ctx, p, ux, uy, off, displayFont());
    return;
  }
  for (const s of spread.slots) {
    const t = touches(s.frame);
    // zdjęcia przy krawędzi wychodzą na spad
    const x0 = off + s.frame.x * ux - (t.left ? off : 0);
    const y0 = off + s.frame.y * uy - (t.top ? off : 0);
    const x1 = off + (s.frame.x + s.frame.w) * ux + (t.right ? off : 0);
    const y1 = off + (s.frame.y + s.frame.h) * uy + (t.bottom ? off : 0);
    const img = await getImage(s.photo);
    if (img) drawCover(ctx, img, Math.round(x0), Math.round(y0), Math.round(x1 - x0), Math.round(y1 - y0), s.fx ?? 0.5, s.fy ?? 0.45);
    else {
      ctx.fillStyle = "#d9d3cc";
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
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
