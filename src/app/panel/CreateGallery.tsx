"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

function toSlug(text: string) {
  return text
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// Hasło łatwe do przepisania z SMS-a: bez liter i cyfr, które łatwo pomylić (l, 1, o, 0)
function generatePassword() {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = new Uint32Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

type Layout = "mozaika" | "siatka";

export default function CreateGallery({ label, className }: { label: string; className?: string }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [layout, setLayout] = useState<Layout>("mozaika");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const slug = toSlug(name);

  function open() {
    setName("");
    setPassword(generatePassword());
    setLayout("mozaika");
    setError("");
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!slug) return setError("Wpisz nazwę galerii.");
    if (password.trim() && password.trim().length < 4) {
      return setError("Hasło musi mieć co najmniej 4 znaki.");
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/galleries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gallery: slug,
          title: name.trim(),
          clientPassword: password.trim(),
          layout,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Nie udało się utworzyć galerii.");
      close();
      router.push(`/panel/galeria/${slug}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się utworzyć galerii.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className={className} onClick={open}>
        {label}
      </button>

      <dialog
        ref={dialogRef}
        className="modal"
        aria-labelledby="nowa-galeria-tytul"
        onClick={(e) => {
          if (e.target === dialogRef.current) close();
        }}
      >
        <form onSubmit={handleSubmit} className="modal-body">
          <h2 id="nowa-galeria-tytul">Nowa galeria</h2>

          <label htmlFor="ng-nazwa">Nazwa galerii</label>
          <input
            id="ng-nazwa"
            type="text"
            placeholder="np. Anna i Marek"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            required
          />
          {slug && <p className="hint">Adres: /galeria/{slug}</p>}

          <label htmlFor="ng-haslo">Hasło dla klienta</label>
          <div className="pass-row">
            <input
              id="ng-haslo"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
            <button type="button" className="btn btn-ghost btn-small" onClick={() => setPassword(generatePassword())}>
              Generuj
            </button>
          </div>
          <p className="hint">Wyślij je klientowi razem z linkiem. Usuń, jeśli galeria ma być otwarta.</p>

          <fieldset className="layout-pick">
            <legend>Układ zdjęć</legend>
            <label className={layout === "mozaika" ? "pick active" : "pick"}>
              <input
                type="radio"
                name="layout"
                value="mozaika"
                checked={layout === "mozaika"}
                onChange={() => setLayout("mozaika")}
              />
              <span className="pick-icon mosaic-icon" aria-hidden="true">
                <i /><i /><i /><i /><i />
              </span>
              <span className="pick-title">Mozaika</span>
              <span className="pick-desc">Zdjęcia w naturalnych proporcjach</span>
            </label>
            <label className={layout === "siatka" ? "pick active" : "pick"}>
              <input
                type="radio"
                name="layout"
                value="siatka"
                checked={layout === "siatka"}
                onChange={() => setLayout("siatka")}
              />
              <span className="pick-icon grid-icon" aria-hidden="true">
                <i /><i /><i /><i /><i /><i />
              </span>
              <span className="pick-title">Siatka</span>
              <span className="pick-desc">Równe, kwadratowe kadry</span>
            </label>
          </fieldset>

          <p className="hint">Najpierw prześlij zdjęcia. Pakiet i cenę wybierzesz przy publikacji, gdy będzie wiadomo, ile miejsca zajmuje galeria.</p>

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          <div className="modal-actions">
            <button type="button" className="as-link" onClick={close}>
              Anuluj
            </button>
            <button type="submit" className="btn" disabled={busy}>
              {busy ? "Tworzę…" : "Utwórz galerię"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
