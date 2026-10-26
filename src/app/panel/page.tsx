export default function Panel() {
  return (
    <section className="panel">
      <h1>Twoje galerie</h1>
      <p className="lead">Tutaj pojawią się sesje, które oddajesz klientom.</p>
      <div className="empty">
        <p>Nie masz jeszcze żadnej galerii.</p>
        <button className="btn" type="button" disabled>Utwórz galerię</button>
      </div>
    </section>
  );
}
