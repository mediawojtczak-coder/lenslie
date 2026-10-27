import { getUser } from "@/lib/supabase/server";
import SelectionActions from "./SelectionActions";
import { getLang } from "@/lib/lang-server";
import { tr, locale } from "@/lib/lang";


type Row = {
  id: string;
  client_name: string;
  client_email: string | null;
  photos: string[];
  note: string | null;
  updated_at: string;
};


// Ulubione zdjęcia wybrane przez klientów tej galerii
export default async function SelectionsTab({
  id,
  photos,
}: {
  id: string;
  photos: { name: string; fileName: string; url: string }[];
}) {
  const { supabase } = await getUser();
  const lang = await getLang();
  const t = (pl: string, en: string) => tr(lang, pl, en);
  const fmt = new Intl.DateTimeFormat(locale(lang), { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Warsaw" });
  const { data, error } = await supabase
    .from("selections")
    .select("id, client_name, client_email, photos, note, updated_at")
    .eq("gallery_id", id)
    .order("updated_at", { ascending: false });

  if (error) {
    return (
      <p className="warn-inline">
        {t("Wybory klientów nie są jeszcze włączone.", "Client selections are not enabled yet.")}
        <br />
        <small>
          {t("Szczegóły", "Details")}: {error.code ?? ""} {error.message}
        </small>
      </p>
    );
  }

  const rows = (data ?? []) as Row[];
  const byName = new Map(photos.map((p) => [p.name, p]));

  if (rows.length === 0) {
    return (
      <div className="empty-state">
        <p>{t("Nikt jeszcze nie wybrał ulubionych zdjęć.", "No one has picked favourite photos yet.")}</p>
        <p className="hint-inline">{t("Klient zaznacza serduszkiem zdjęcia w galerii, a jego wybór pojawi się tutaj.", "Your client marks photos with a heart in the gallery, and the selection appears here.")}</p>
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
                  {items.length} {items.length === 1 ? t("zdjęcie", "photo") : t("zdjęć", "photos")} · {t("zmiana", "updated")} {fmt.format(new Date(r.updated_at))}
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
              <p className="hint-inline">{t("Brak zaznaczonych zdjęć.", "No photos selected.")}</p>
            )}
          </article>
        );
      })}
    </div>
  );
}
