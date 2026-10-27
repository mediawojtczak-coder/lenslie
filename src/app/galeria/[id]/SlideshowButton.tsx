"use client";

// Uruchamia pokaz slajdów w siatce zdjęć
export default function SlideshowButton() {
  return (
    <button type="button" className="g-slideshow" onClick={() => window.dispatchEvent(new Event("lenslie:slideshow"))}>
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <path d="M8 5.5v13l10-6.5z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
      <span>Pokaz slajdów</span>
    </button>
  );
}
