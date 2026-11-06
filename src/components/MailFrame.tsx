"use client";

import { useEffect, useRef, useState } from "react";

const W = 640; // szerokość, w której renderujemy mail (jak w programie pocztowym)

// Podgląd prawdziwego maila (HTML) w ramce okna poczty – skalowany do szerokości miejsca
export default function MailFrame({ html, from, subject, maxHeight, fromLabel = "Od" }: { html: string; from: string; subject: string; maxHeight?: number; fromLabel?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  // wysokość maila – po wczytaniu (także gdy ramka wczytała się przed uruchomieniem skryptu) i po dociągnięciu zdjęć i czcionek
  const measure = () => {
    const h = frame.current?.contentDocument?.documentElement.scrollHeight;
    if (h && h > 200) setHeight(h);
  };
  const [scale, setScale] = useState(0.7);
  const [height, setHeight] = useState(1300);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(Math.min(1, el.clientWidth / W)));
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
          style={{ width: W, height, transform: `scale(${scale})` }}
          ref={frame}
          onLoad={measure}
        />
      </div>
    </div>
  );
}
