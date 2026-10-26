export default async function Galeria({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const zdjecia = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <>
      <h1>Galeria: {id}</h1>
      <p className="muted">
        Widok klienta. Później będzie tu pytanie o hasło i prawdziwe zdjęcia z R2.
      </p>
      <div className="grid">
        {zdjecia.map((n) => (
          <div key={n} className="ph">Zdjęcie {n}</div>
        ))}
      </div>
    </>
  );
}
