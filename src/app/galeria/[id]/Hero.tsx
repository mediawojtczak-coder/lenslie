"use client";

import { useEffect, useRef, useState } from "react";

// Pełnoekranowa okładka galerii: zdjęcie spokojnie się wyłania, potem tytuł i przycisk
export default function Hero({
  id,
  title,
  subtitle,
  coverUrl,
  locked,
  error,
}: {
  id: string;
  title: string;
  subtitle?: string;
  coverUrl: string | null;
  locked: boolean;
  error: boolean;
}) {
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
        <h1 className="hero-title">{title}</h1>
        {subtitle && <p className="hero-sub">{subtitle}</p>}

        {locked ? (
          showForm ? (
            <form method="post" action={`/api/galleries/${id}/unlock`} className="hero-form">
              <label htmlFor="password" className="sr-only">
                Hasło do galerii
              </label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Hasło do galerii"
                autoComplete="off"
                required
                autoFocus
              />
              <button type="submit" className="hero-btn">
                Otwórz
              </button>
              {error && (
                <p className="hero-error" role="alert">
                  Nieprawidłowe hasło. Sprawdź wiadomość od fotografa.
                </p>
              )}
            </form>
          ) : (
            <button type="button" className="hero-btn" onClick={() => setShowForm(true)}>
              Wejdź do galerii
            </button>
          )
        ) : (
          <a href="#zdjecia" className="hero-btn">
            Zobacz zdjęcia
          </a>
        )}
      </div>
    </header>
  );
}
