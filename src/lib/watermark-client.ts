// Znak wodny rysowany w przeglądarce fotografa: powtarzany, ukośny, półprzezroczysty napis

export function drawWatermark(ctx: CanvasRenderingContext2D, w: number, h: number, text: string) {
  const size = Math.max(16, Math.round(Math.min(w, h) / 14));
  ctx.save();
  ctx.font = `${size}px Georgia, "Times New Roman", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255, 255, 255, 0.42)";
  ctx.strokeStyle = "rgba(0, 0, 0, 0.14)";
  ctx.lineWidth = Math.max(1, size / 22);
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-Math.PI / 6);
  const diag = Math.hypot(w, h);
  const stepX = ctx.measureText(text).width + size * 3;
  const stepY = size * 4.5;
  let row = 0;
  for (let y = -diag / 2; y <= diag / 2; y += stepY, row++) {
    const offset = row % 2 ? stepX / 2 : 0;
    for (let x = -diag / 2 - stepX + offset; x <= diag / 2 + stepX; x += stepX) {
      ctx.strokeText(text, x, y);
      ctx.fillText(text, x, y);
    }
  }
  ctx.restore();
}

export function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Nie udało się przetworzyć zdjęcia."))), "image/jpeg", 0.85),
  );
}

// Tworzy wersję ze znakiem wodnym z gotowej wersji do oglądania (pobranej z R2)
export async function watermarkFromUrl(src: string, text: string): Promise<Blob> {
  const res = await fetch(src);
  if (!res.ok) throw new Error("Nie udało się pobrać zdjęcia.");
  const bitmap = await createImageBitmap(await res.blob());
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Przeglądarka nie obsługuje przetwarzania zdjęć.");
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  drawWatermark(ctx, canvas.width, canvas.height, text);
  return canvasToJpeg(canvas);
}
