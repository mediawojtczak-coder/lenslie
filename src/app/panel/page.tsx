import Uploader from "./Uploader";

export default function Panel() {
  return (
    <section className="panel narrow-wide">
      <h1>Nowa galeria</h1>
      <p className="lead">
        Wpisz nazwę sesji i wybierz zdjęcia. Każde zdjęcie zapisze się w pełnej jakości
        do pobrania oraz w lżejszej wersji do oglądania.
      </p>
      <Uploader />
    </section>
  );
}
