"use client";

import { publicOrigin } from "@/lib/public-origin";
import { useTr } from "@/components/LangProvider";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Guest = { enabled: boolean; token: string; sections: string[]; downloads: "web" | "none" };

// Osobny link dla gości wesela: bez hasła, wybrane sekcje, bez oryginałów
export default function GuestCard({
  id,
  guest: initial,
  sections,
}: {
  id: string;
  guest: Guest | null;
  sections: { id: string; name: string }[];
}) {
  const router = useRouter();
  const t = useTr();
  const [guest, setGuest] = useState<Guest | null>(initial);
  const [chosen, setChosen] = useState<string[]>(initial?.sections ?? []);
  const [downloads, setDownloads] = useState<"web" | "none">(initial?.downloads ?? "web");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  const [error, setError] = useState("");

  useEffect(() => setOrigin(publicOrigin()), []);

  async function send(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/galleries/${id}/guest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("Nie udało się zapisać.", "Could not save."));
      setGuest(data.guest);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Nie udało się zapisać.", "Could not save."));
    } finally {
      setBusy(false);
    }
  }

  const link = guest ? `${origin}/galeria/${id}/goscie/${guest.token}` : "";

  async function copy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="settings-card">
      <h2>{t("Link dla gości", "Guest link")}</h2>
      <p>
        {t("Osobny link bez hasła, np. dla gości weselnych. Pokazuje tylko wybrane sekcje i nigdy nie daje oryginałów w pełnej rozdzielczości.", "A separate link without a password, e.g. for wedding guests. It shows only the chosen sections and never gives full-resolution originals.")}
      </p>

      <label className="check">
        <input
          type="checkbox"
          checked={Boolean(guest?.enabled)}
          disabled={busy}
          onChange={(e) => send({ enabled: e.target.checked, sections: chosen, downloads })}
        />
        {t("Włącz link dla gości", "Turn on the guest link")}
      </label>

      {guest?.enabled && (
        <>
          <div className="copy-row guest-link">
            <span className="share-url">{link}</span>
            <button type="button" className="btn btn-ghost btn-small" onClick={copy}>
              {copied ? t("Skopiowano", "Copied") : t("Kopiuj link", "Copy link")}
            </button>
          </div>

          {sections.length > 0 && (
            <>
              <p className="field-title">{t("Sekcje widoczne dla gości", "Sections visible to guests")}</p>
              <div className="chips">
                {sections.map((s) => {
                  const on = chosen.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      className={on ? "chip active" : "chip"}
                      aria-pressed={on}
                      onClick={() => setChosen((c) => (on ? c.filter((x) => x !== s.id) : [...c, s.id]))}
                    >
                      {s.name}
                    </button>
                  );
                })}
              </div>
              <p className="hint">{chosen.length === 0 ? t("Nic nie zaznaczono – goście widzą wszystkie zdjęcia.", "Nothing selected – guests see all photos.") : t("Goście zobaczą tylko zaznaczone sekcje.", "Guests will see only the selected sections.")}</p>
            </>
          )}

          <p className="field-title">{t("Pobieranie dla gości", "Guest downloads")}</p>
          <div className="option-list">
            <label className={downloads === "web" ? "option active" : "option"}>
              <input type="radio" name="guest-dl" checked={downloads === "web"} onChange={() => setDownloads("web")} />
              <span>
                <strong>{t("Wersje do internetu", "Web versions")}</strong>
                <small>{t("Goście mogą pobrać mniejsze pliki", "Guests can download smaller files")}</small>
              </span>
            </label>
            <label className={downloads === "none" ? "option active" : "option"}>
              <input type="radio" name="guest-dl" checked={downloads === "none"} onChange={() => setDownloads("none")} />
              <span>
                <strong>{t("Tylko oglądanie", "View only")}</strong>
                <small>{t("Bez pobierania", "No downloads")}</small>
              </span>
            </label>
          </div>

          <div className="modal-actions left">
            <button type="button" className="btn" disabled={busy} onClick={() => send({ sections: chosen, downloads })}>
              {busy ? t("Zapisuję…", "Saving…") : t("Zapisz", "Save")}
            </button>
            <button
              type="button"
              className="as-link"
              disabled={busy}
              onClick={() => {
                if (window.confirm(t("Utworzyć nowy link? Stary link przestanie działać.", "Create a new link? The old link will stop working."))) send({ newLink: true });
              }}
            >
              {t("Utwórz nowy link", "Create a new link")}
            </button>
          </div>
        </>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
