export default function Logowanie() {
  return (
    <section className="narrow">
      <h1>Witaj ponownie</h1>
      <p className="lead">Zaloguj się, aby zarządzać galeriami.</p>
      <form>
        <label htmlFor="email">E-mail</label>
        <input id="email" type="email" autoComplete="email" />
        <label htmlFor="haslo">Hasło</label>
        <input id="haslo" type="password" autoComplete="current-password" />
        <button className="btn" type="button" disabled>Zaloguj się</button>
      </form>
    </section>
  );
}
