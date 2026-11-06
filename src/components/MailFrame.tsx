"use client";

import { useEffect, useRef, useState } from "react";

const W = 640; // szerokość, w której renderujemy mail (jak w programie pocztowym)

// Podgląd prawdziwego maila (HTML) w ramce okna poczty – skalowany do szerokości miejsca
export default function MailFrame({ html, from, subject, maxHeight, fromLabel = "Od" }: { html: string; from: string; subject: string; maxHeight?: number; fromLabel?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  // wysokość maila – po wczytaniu (także gdy ramka wczytała się przed uruchomieniem skryptu) i po dociągnięciu zdjęć i czcionek
  const measure = () => {
    // wysokość samej treści (scrollHeight dokumentu nie bywa mniejszy niż ramka – zostałby pusty pas na dole)
    const body = frame.current?.contentDocument?.body;
    const h = body ? Math.ceil(body.getBoundingClientRect().height) : 0;
    if (h > 200) setHeight(h);
  };
  const [width, setWidth] = useState(W * 0.7);
  const [height, setHeight] = useState(1300);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    measure();
    const t1 = setTimeout(measure, 600);
    const t2 = setTimeout(measure, 2000);
    return () => {
      ro.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // mail nigdy nie jest większy niż w programie pocztowym; w szerszym oknie – wyśrodkowany
  const scale = Math.min(1, width / W);
  const left = Math.max(0, (width - W * scale) / 2);
  const shown = height * scale;
  const clip = maxHeight && shown > maxHeight ? maxHeight : shown;

  return (
    <div className="mf">
      <div className="mf-bar" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div className="mf-head">
        <p>
          <span>{fromLabel}</span>
          {from}
        </p>
        <p className="mf-subject">{subject}</p>
      </div>
      <div ref={box} className={clip < shown ? "mf-body mf-cut" : "mf-body"} style={{ height: clip }}>
        <iframe
          title={subject}
          srcDoc={html}
          sandbox="allow-same-origin"
          tabIndex={-1}
          scrolling="no"
          style={{ width: W, height, left, transform: `scale(${scale})` }}
          ref={frame}
          onLoad={measure}
        />
      </div>
    </div>
  );
}
