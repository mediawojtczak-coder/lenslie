"use client";

import { useMemo } from "react";
import QRCode from "qrcode";

// Elegancki kod QR: okrągłe kropki i zaokrąglone „oczka” zamiast surowych kwadratów.
// Wysoka korekcja błędów (H), więc mimo ozdobnego kształtu skanuje się bez problemu.
export function qrSvg(text: string, color = "#3b3633", accent = "#8c6c48") {
  const qr = QRCode.create(text, { errorCorrectionLevel: "H" });
  const n: number = qr.modules.size;
  const data: Uint8Array = qr.modules.data;
  const at = (x: number, y: number) => data[y * n + x] === 1;
  const inEye = (x: number, y: number) => (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
  const dots: string[] = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (at(x, y) && !inEye(x, y)) dots.push(`<circle cx="${x + 0.5}" cy="${y + 0.5}" r="0.43"/>`);
    }
  }
  const eye = (x: number, y: number) =>
    `<rect x="${x + 0.5}" y="${y + 0.5}" width="6" height="6" rx="1.9" fill="none" stroke="${color}" stroke-width="1"/>` +
    `<rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx="0.9" fill="${accent}"/>`;
  const pad = 1.5;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${n + pad * 2} ${n + pad * 2}" shape-rendering="geometricPrecision">` +
    `<rect x="${-pad}" y="${-pad}" width="${n + pad * 2}" height="${n + pad * 2}" fill="#fff"/>` +
    `<g fill="${color}">${dots.join("")}</g>${eye(0, 0)}${eye(n - 7, 0)}${eye(0, n - 7)}</svg>`
  );
}

export default function FancyQr({ text, className, label }: { text: string; className?: string; label?: string }) {
  const svg = useMemo(() => qrSvg(text), [text]);
  return <span className={className} role="img" aria-label={label} dangerouslySetInnerHTML={{ __html: svg }} />;
}

// PNG do pobrania (np. do zaproszeń lub prezentacji)
export async function qrPng(text: string, size = 1600): Promise<string> {
  const svg = qrSvg(text);
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = c.height = size;
  c.getContext("2d")!.drawImage(img, 0, 0, size, size);
  return c.toDataURL("image/png");
}
