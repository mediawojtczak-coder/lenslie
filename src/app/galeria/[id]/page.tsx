const proporcje = ["r-tall", "r-wide", "r-sq", "r-wide", "r-tall", "r-sq", "r-tall", "r-wide", "r-sq"];
const tony = ["", "b", "c", "d", "e"];

export default async function Galeria({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const demo = id === "demo";

  return (
    <>
      <section className="cover">
        <h1>{demo ? "Anna & Marek" : id}</h1>
        <p className="meta">{demo ? "Ślub, 14 września 2026" : "Galeria"}</p>
        <button className="btn btn-ghost" type="button" disabled>
          Pobierz wszystkie zdjęcia
        </button>
      </section>

      <section className="masonry" aria-label="Zdjęcia">
        {Array.from({ length: 18 }, (_, i) => (
          <div
            key={i}
            className={`tile ${proporcje[i % proporcje.length]} ${tony[(i * 3) % tony.length]}`}
          />
        ))}
      </section>
    </>
  );
}
