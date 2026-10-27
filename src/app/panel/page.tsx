import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import Uploader from "./Uploader";

export const dynamic = "force-dynamic";

type GalleryRow = { id: string; title: string; created_at: string };

const dateFmt = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric" });

export default async function Panel() {
  const { supabase, user } = await getUser();
  if (!user) redirect("/logowanie");

  const { data } = await supabase
    .from("galleries")
    .select("id, title, created_at")
    .order("created_at", { ascending: false });
  const galleries = (data ?? []) as GalleryRow[];

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h1>Twoje galerie</h1>
          <p className="lead">Zalogowano jako {user.email}</p>
        </div>
        <form method="post" action="/auth/wyloguj">
          <button className="link-quiet as-link" type="submit">Wyloguj</button>
        </form>
      </div>

      {galleries.length === 0 ? (
        <p className="notice-left">Nie masz jeszcze żadnej galerii. Utwórz pierwszą poniżej.</p>
      ) : (
        <ul className="gallery-list">
          {galleries.map((g) => (
            <li key={g.id}>
              <Link href={`/galeria/${g.id}`}>{g.title}</Link>
              <span>{dateFmt.format(new Date(g.created_at))}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="narrow-wide new-gallery">
        <h2>Nowa galeria</h2>
        <p className="lead">
          Wpisz nazwę sesji i wybierz zdjęcia. Aby dodać zdjęcia do istniejącej galerii, wpisz
          dokładnie tę samą nazwę.
        </p>
        <Uploader />
      </div>
    </section>
  );
}
