// Grafika obok logowania: tablet i telefon z przykładową galerią par młodych w Lenslie
const P = (n: number) => `/home/foto-${n}.jpg`;

function Heart({ on = false }: { on?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"
        fill={on ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function LoginShowcase({ note = "Każda sesja w swojej oprawie" }: { note?: string }) {
  return (
    <div className="login-visual lv" aria-hidden="true">
      <div className="lv-tablet">
        <div className="lv-tablet-screen">
          <div className="lv-bar">
            <b>Anna Nowak Fotografia</b>
            <span>Pokaz slajdów</span>
            <span className="lv-pill">Pobierz wszystkie</span>
          </div>
          <div className="lv-cover">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={P(1)} alt="" />
            <div className="lv-cover-text">
              <small>Anna Nowak Fotografia</small>
              <strong>Julia &amp; Michał</strong>
              <em>14 września 2026 · 486 zdjęć</em>
              <i>Zobacz zdjęcia</i>
            </div>
          </div>
          <div className="lv-sections">
            <span className="on">Przygotowania</span>
            <span>Ceremonia</span>
            <span>Wesele</span>
            <span>Plener</span>
          </div>
          <div className="lv-grid">
            {[2, 4, 3, 7, 5, 6, 1, 4].map((n, i) => (
              <div key={i} className="lv-shot">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={P(n)} alt="" />
                {i === 1 && (
                  <span className="lv-heart">
                    <Heart on />
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="lv-phone">
        <div className="lv-phone-screen">
          <div className="lv-notch" />
          <div className="lv-phone-cover">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={P(5)} alt="" />
            <div className="lv-cover-text">
              <strong>Julia &amp; Michał</strong>
              <i>Zobacz zdjęcia</i>
            </div>
          </div>
          <div className="lv-phone-grid">
            {[6, 2, 7, 3].map((n, i) => (
              <div key={i} className="lv-shot">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={P(n)} alt="" />
                {i === 2 && (
                  <span className="lv-heart">
                    <Heart on />
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="lv-favbar">
            <span>
              <Heart on /> 12
            </span>
            <b>Wyślij fotografowi</b>
          </div>
        </div>
      </div>

      <div className="lv-card">
        <span className="lv-card-heart">
          <Heart on />
        </span>
        <div>
          <b>Klientka wybrała 12 zdjęć</b>
          <small>do albumu ślubnego</small>
        </div>
      </div>

      <p className="visual-note">{note}</p>
    </div>
  );
}
