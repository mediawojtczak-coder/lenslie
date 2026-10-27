// Makieta laptopa i telefonu z galerią Lenslie – „zdjęcie reklamowe” zbudowane w kodzie.
// Zdjęcia pochodzą z galerii pokazowej fotografa; bez niej pokazujemy pastelowe kadry.
type Props = { photos: string[]; title: string };

const TONES = ["", "b", "c", "d", "e"];

function Shot({ src, i, className = "" }: { src?: string; i: number; className?: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={`shot ${className}`} loading="lazy" />
  ) : (
    <span className={`shot tile ${TONES[i % TONES.length]} ${className}`} />
  );
}

export default function DeviceShowcase({ photos, title }: Props) {
  const pick = (i: number) => (photos.length ? photos[i % photos.length] : undefined);

  return (
    <div className="devices" aria-hidden="true">
      <div className="laptop">
        <div className="laptop-screen">
          <div className="mock-browser">
            <span /><span /><span />
            <i>lenslie.com/galeria/{title.toLowerCase().replace(/[^a-z0-9ąćęłńóśźż]+/gi, "-")}</i>
          </div>
          <div className="mock-page">
            <div className="mock-cover">
              <Shot src={pick(0)} i={0} />
              <div className="mock-cover-text">
                <b>{title}</b>
                <em>Zobacz zdjęcia</em>
              </div>
            </div>
            <div className="mock-grid">
              {Array.from({ length: 8 }, (_, i) => (
                <Shot key={i} src={pick(i + 1)} i={i + 1} />
              ))}
            </div>
          </div>
        </div>
        <div className="laptop-base" />
      </div>

      <div className="phone">
        <div className="phone-screen">
          <div className="phone-notch" />
          <div className="mock-cover phone-cover">
            <Shot src={pick(2)} i={2} />
            <div className="mock-cover-text">
              <b>{title}</b>
              <em>Zobacz zdjęcia</em>
            </div>
          </div>
          <div className="mock-grid phone-grid">
            {Array.from({ length: 4 }, (_, i) => (
              <Shot key={i} src={pick(i + 4)} i={i + 4} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
