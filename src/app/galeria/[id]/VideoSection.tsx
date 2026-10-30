import { T, type Lang } from "@/lib/i18n";

export type ClientVideo = { id: string; name: string; iframe?: string; src: string; poster?: string; download?: string; size: number; youtube?: boolean };

const fmtSize = (b: number) => (b >= 1e9 ? `${(b / 1e9).toFixed(2).replace(".", ",")} GB` : `${Math.max(1, Math.round(b / 1e6))} MB`);

// Filmy na samej górze galerii: podgląd do oglądania i oryginał w pełnej jakości do pobrania
export default function VideoSection({ videos, lang }: { videos: ClientVideo[]; lang: Lang }) {
  const t = T[lang];
  return (
    <section className="g-videos" aria-label={t.videos}>
      {videos.map((v) => (
        <figure key={v.id} className="g-video">
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
