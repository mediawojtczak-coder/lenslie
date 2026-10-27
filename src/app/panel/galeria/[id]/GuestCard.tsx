"use client";

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
  const [guest, setGuest] = useState<Guest | null>(initial);
  const [chosen, setChosen] = useState<string[]>(initial?.sections ?? []);
  const [downloads, setDownloads] = useState<"web" | "none">(initial?.downloads ?? "web");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  const [error, setError] = useState("");

  useEffect(() => setOrigin(window.location.origin), []);

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
      if (!res.ok) throw new Error(data.error ?? "Nie udało się zapisać.");
      setGuest(data.guest);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zapisać.");
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
      <h2>Link dla gości</h2>
      <p>
        Osobny link bez hasła, np. dla gości weselnych. Pokazuje tylko wybrane sekcje i nigdy nie daje oryginałów w pełnej
        rozdzielczości.
      </p>

      <label className="check">
        <input
          type="checkbox"
          checked={Boolean(guest?.enabled)}
          disabled={busy}
          onChange={(e) => send({ enabled: e.target.checked, sections: chosen, downloads })}
        />
        Włącz link dla gości
      </label>

      {guest?.enabled && (
        <>
          <div className="copy-row guest-link">
            <span className="share-url">{link}</span>
            <button type="button" className="btn btn-ghost btn-small" onClick={copy}>
              {copied ? "Skopiowano" : "Kopiuj link"}
            </button>
          </div>

          {sections.length > 0 && (
            <>
              <p className="field-title">Sekcje widoczne dla gości</p>
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
              <p className="hint">{chosen.length === 0 ? "Nic nie zaznaczono – goście widzą wszystkie zdjęcia." : "Goście zobaczą tylko zaznaczone sekcje."}</p>
            </>
          )}

          <p className="field-title">Pobieranie dla gości</p>
          <div className="option-list">
            <label className={downloads === "web" ? "option active" : "option"}>
              <input type="radio" name="guest-dl" checked={downloads === "web"} onChange={() => setDownloads("web")} />
              <span>
                <strong>Wersje do internetu</strong>
                <small>Goście mogą pobrać mniejsze pliki</small>
              </span>
            </label>
            <label className={downloads === "none" ? "option active" : "option"}>
              <input type="radio" name="guest-dl" checked={downloads === "none"} onChange={() => setDownloads("none")} />
              <span>
                <strong>Tylko oglądanie</strong>
                <small>Bez pobierania</small>
              </span>
            </label>
          </div>

          <div className="modal-actions left">
            <button type="button" className="btn" disabled={busy} onClick={() => send({ sections: chosen, downloads })}>
              {busy ? "Zapisuję…" : "Zapisz"}
            </button>
            <button
              type="button"
              className="as-link"
              disabled={busy}
              onClick={() => {
                if (window.confirm("Utworzyć nowy link? Stary link przestanie działać.")) send({ newLink: true });
              }}
            >
              Utwórz nowy link
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
