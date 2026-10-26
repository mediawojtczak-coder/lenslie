import Link from "next/link";

export default function Home() {
  return (
    <>
      <h1>Piękne galerie dla Twoich klientów</h1>
      <p className="muted">
        Wgraj zdjęcia z sesji, wyślij klientowi link z hasłem i gotowe.
      </p>
      <Link href="/logowanie" className="btn">Zaloguj się</Link>

      <div className="card">
        <strong>Wersja robocza</strong>
        <p className="muted">
          To szkielet aplikacji. Kolejne kroki: wgrywanie zdjęć do R2,
          galeria z hasłem, konta fotografów.
        </p>
        <p>
          Przykładowa galeria: <Link href="/galeria/demo">/galeria/demo</Link>
        </p>
      </div>
    </>
  );
}
