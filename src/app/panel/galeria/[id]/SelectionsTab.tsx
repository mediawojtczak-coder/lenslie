import { getUser } from "@/lib/supabase/server";
import SelectionActions from "./SelectionActions";

type Row = {
  id: string;
  client_name: string;
  client_email: string | null;
  photos: string[];
  note: string | null;
  updated_at: string;
};

const fmt = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Warsaw" });

// Ulubione zdjęcia wybrane przez klientów tej galerii
export default async function SelectionsTab({
  id,
  photos,
}: {
  id: string;
  photos: { name: string; fileName: string; url: string }[];
}) {
  const { supabase } = await getUser();
  const { data, error } = await supabase
    .from("selections")
    .select("id, client_name, client_email, photos, note, updated_at")
    .eq("gallery_id", id)
    .order("updated_at", { ascending: false });

  if (error) {
    return (
      <p className="warn-inline">
        Wybory klientów nie są jeszcze włączone: w Supabase trzeba uruchomić SQL z tabelą „selections” i dodać klucz
        SUPABASE_SECRET_KEY w Vercelu.
      </p>
    );
  }

  const rows = (data ?? []) as Row[];
  const byName = new Map(photos.map((p) => [p.name, p]));

  if (rows.length === 0) {
    return (
      <div className="empty-state">
        <p>Nikt jeszcze nie wybrał ulubionych zdjęć.</p>
        <p className="hint-inline">Klient zaznacza serduszkiem zdjęcia w galerii, a jego wybór pojawi się tutaj.</p>
      </div>
    );
  }

  return (
    <div className="selections">
      {rows.map((r) => {
        const items = r.photos.map((n) => byName.get(n)).filter((p): p is NonNullable<typeof p> => Boolean(p));
        return (
          <article key={r.id} className="settings-card selection">
            <header className="selection-head">
              <div>
                <h2>{r.client_name}</h2>
                <p className="hint-inline">
                  {r.client_email && (
                    <>
                      <a href={`mailto:${r.client_email}`}>{r.client_email}</a> ·{" "}
                    </>
                  )}
                  {items.length} {items.length === 1 ? "zdjęcie" : "zdjęć"} · zmiana {fmt.format(new Date(r.updated_at))}
                </p>
              </div>
              <SelectionActions galleryId={id} selectionId={r.id} name={r.client_name} fileNames={items.map((p) => p.fileName)} />
            </header>
            {r.note && <blockquote className="selection-note">{r.note}</blockquote>}
            {items.length > 0 ? (
              <ul className="selection-grid">
                {items.map((p) => (
                  <li key={p.name} title={p.fileName}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={p.fileName} loading="lazy" />
                    <span>{p.fileName}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="hint-inline">Brak zaznaczonych zdjęć.</p>
            )}
          </article>
        );
      })}
    </div>
  );
}
