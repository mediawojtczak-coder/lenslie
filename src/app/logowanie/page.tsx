export default function Logowanie() {
  return (
    <>
      <h1>Logowanie</h1>
      <p className="muted">Logowanie fotografa (podłączymy je do Supabase).</p>
      <form className="card">
        <label htmlFor="email">E-mail</label>
        <input id="email" type="email" placeholder="ty@example.com" />
        <label htmlFor="haslo">Hasło</label>
        <input id="haslo" type="password" />
        <button className="btn" type="button" disabled>Zaloguj (wkrótce)</button>
      </form>
    </>
  );
}
