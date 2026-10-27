import Hero from "./Hero";
import { ClientGallery } from "./ClientGallery";

export const dynamic = "force-dynamic";

// Galerie są prywatne – nie pokazujemy ich w wyszukiwarkach
export const metadata = { robots: { index: false, follow: false } };

const proporcje = ["r-tall", "r-wide", "r-sq", "r-wide", "r-tall", "r-sq", "r-tall", "r-wide", "r-sq"];
const tony = ["", "b", "c", "d", "e"];


export default async function Galeria({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ blad?: string }>;
}) {
  const { id } = await params;
  const { blad } = await searchParams;

  // Przykładowa galeria bez zdjęć
  if (id === "demo") {
    return (
      <>
        <Hero id={id} title="Anna & Marek" subtitle="Ślub, 14 września 2026" coverUrl={null} locked={false} error={false} />
        <main className="g-photos" id="zdjecia">
          <section className="masonry" aria-label="Przykładowe zdjęcia">
            {Array.from({ length: 18 }, (_, i) => (
              <div key={i} className={`tile ${proporcje[i % proporcje.length]} ${tony[(i * 3) % tony.length]}`} />
            ))}
          </section>
        </main>
      </>
    );
  }

  return <ClientGallery id={id} blad={blad} />;
}
