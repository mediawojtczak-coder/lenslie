export default function Panel() {
  return (
    <>
      <h1>Panel fotografa</h1>
      <p className="muted">Tu będą Twoje galerie i wgrywanie zdjęć.</p>
      <div className="card">
        <strong>Moje galerie</strong>
        <p className="muted">Nie masz jeszcze żadnej galerii.</p>
        <button className="btn" type="button" disabled>Nowa galeria (wkrótce)</button>
      </div>
    </>
  );
}
