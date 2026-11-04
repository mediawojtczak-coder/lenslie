import { T, type Lang } from "@/lib/i18n";

export type ClientVideo = { id: string; name: string; iframe?: string; src: string; poster?: string; download?: string; size: number; youtube?: boolean; instagram?: boolean };

const fmtSize = (b: number) => (b >= 1e9 ? `${(b / 1e9).toFixed(2).replace(".", ",")} GB` : `${Math.max(1, Math.round(b / 1e6))} MB`);

// Filmy na samej górze galerii: podgląd do oglądania i oryginał w pełnej jakości do pobrania
export default function VideoSection({ videos, lang }: { videos: ClientVideo[]; lang: Lang }) {
  const t = T[lang];
  return (
    <section className="g-videos" aria-label={t.videos}>
      {videos.map((v) => (
        <figure key={v.id} className={v.instagram ? "g-video g-video-ig" : "g-video"}>
          {v.instagram ? (
            <a className="g-ig-card" href={v.src} target="_blank" rel="noreferrer">
              {v.poster && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={v.poster} alt="" loading="lazy" />
              )}
              <span className="g-ig-play" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="30" height="30">
                  <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
                </svg>
              </span>
              <span className="g-ig-label">
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
                  <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.6" />
                  <circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" />
                </svg>
                {lang === "en" ? "Watch the Reel on Instagram" : "Zobacz Reels na Instagramie"}
              </span>
            </a>
          ) : (
          <div className="g-video-frame">
            {v.iframe ? (
              <iframe
                src={v.youtube ? v.iframe : `${v.iframe}?preload=metadata&primaryColor=%23f4e8e3`}
                title={v.name}
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                loading="lazy"
                referrerPolicy={v.youtube ? "strict-origin-when-cross-origin" : undefined}
              />
            ) : (
              <video src={v.src} poster={v.poster} controls preload="metadata" playsInline />
            )}
          </div>
          )}
          {v.download && (
            <figcaption>
              <a className="g-video-dl" href={v.download}>
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19h14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t.downloadVideo} · {fmtSize(v.size)}
              </a>
            </figcaption>
          )}
        </figure>
      ))}
    </section>
  );
}
