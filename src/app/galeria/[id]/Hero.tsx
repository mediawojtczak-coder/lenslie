"use client";

import { useEffect, useRef, useState } from "react";
import { T, type Lang } from "@/lib/i18n";

// Pełnoekranowa okładka galerii: zdjęcie spokojnie się wyłania, potem tytuł i przycisk
export default function Hero({
  id,
  title,
  subtitle,
  coverUrl,
  locked,
  error,
  studio,
  lang = "pl",
}: {
  id: string;
  title: string;
  subtitle?: string;
  studio?: string | null;
  coverUrl: string | null;
  locked: boolean;
  error: boolean;
  lang?: Lang;
}) {
  const t = T[lang];
  const [loaded, setLoaded] = useState(!coverUrl);
  const [showForm, setShowForm] = useState(error);
  const imgRef = useRef<HTMLImageElement>(null);

  // Zdjęcie mogło wczytać się z pamięci przeglądarki, zanim strona ożyła – wtedy pokazujemy je od razu.
  // Zabezpieczenie: najpóźniej po 4 s okładka i tak się pokaże.
  useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
    const t = setTimeout(() => setLoaded(true), 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <header className={loaded ? "hero-cover is-ready" : "hero-cover"}>
      {coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img ref={imgRef} src={coverUrl} alt="" className="hero-img" onLoad={() => setLoaded(true)} fetchPriority="high" />
      ) : (
        <div className="hero-img hero-blank" />
      )}
      <div className="hero-shade" />

      <div className="hero-content">
        {studio && <p className="hero-studio">{studio}</p>}
        <h1 className="hero-title">{title}</h1>
        {subtitle && <p className="hero-sub">{subtitle}</p>}

        {locked ? (
          showForm ? (
            <form method="post" action={`/api/galleries/${id}/unlock`} className="hero-form">
              <label htmlFor="password" className="sr-only">
                {t.password}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder={t.password}
                autoComplete="new-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                data-1p-ignore
                data-lpignore="true"
                required
                autoFocus
              />
              <button type="submit" className="hero-btn">
                {t.open}
              </button>
              {error && (
                <p className="hero-error" role="alert">
                  {t.wrongPassword}
                </p>
              )}
            </form>
          ) : (
            <button type="button" className="hero-btn" onClick={() => setShowForm(true)}>
              {t.enter}
            </button>
          )
        ) : (
          <a href="#zdjecia" className="hero-btn">
            {t.seePhotos}
          </a>
        )}
      </div>
    </header>
  );
}
