import Link from "next/link";

export default function Home() {
  return (
    <>
      <section className="hero">
        <h1>Twoje zdjęcia zasługują na piękną oprawę.</h1>
        <p>
          Oddawaj sesje klientom w spokojnej, eleganckiej galerii. Bez reklam,
          bez kompresji, z hasłem i pobieraniem w pełnej jakości.
        </p>
        <div className="actions">
          <Link href="/logowanie" className="btn">Załóż konto</Link>
          <Link href="/galeria/demo" className="link-quiet">Zobacz przykładową galerię</Link>
        </div>
      </section>

      <section className="mosaic" aria-hidden="true">
        <div className="tile t1 b" />
        <div className="tile t2" />
        <div className="tile t3 c" />
        <div className="tile t4 d" />
      </section>

      <section className="features">
        <div>
          <h2>Prywatnie</h2>
          <p>Każda galeria ma własny link i hasło. Widzi ją tylko Twój klient.</p>
        </div>
        <div>
          <h2>W pełnej jakości</h2>
          <p>Klient pobiera pojedyncze zdjęcia albo całą sesję jednym kliknięciem.</p>
        </div>
        <div>
          <h2>Pod Twoją marką</h2>
          <p>Twoje logo, Twoja domena. Lenslie pozostaje w tle.</p>
        </div>
      </section>
    </>
  );
}
