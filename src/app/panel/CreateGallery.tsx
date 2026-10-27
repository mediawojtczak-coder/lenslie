"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTr } from "@/components/LangProvider";

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
  const t = useTr();
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
    if (!slug) return setError(t("Wpisz nazwę galerii.", "Enter a gallery name."));
    if (password.trim() && password.trim().length < 4) {
      return setError(t("Hasło musi mieć co najmniej 4 znaki.", "The password must have at least 4 characters."));
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
      if (!res.ok) throw new Error(data.error ?? t("Nie udało się utworzyć galerii.", "Could not create the gallery."));
      close();
      router.push(`/panel/galeria/${slug}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Nie udało się utworzyć galerii.", "Could not create the gallery."));
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
          <h2 id="nowa-galeria-tytul">{t("Nowa galeria", "New gallery")}</h2>

          <label htmlFor="ng-nazwa">{t("Nazwa galerii", "Gallery name")}</label>
          <input
            id="ng-nazwa"
            type="text"
            placeholder={t("np. Anna i Marek", "e.g. Anna & Mark")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            required
          />
          {slug && <p className="hint">{t("Adres", "Address")}: /galeria/{slug}</p>}

          <label htmlFor="ng-haslo">{t("Hasło dla klienta", "Client password")}</label>
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
              {t("Generuj", "Generate")}
            </button>
          </div>
          <p className="hint">{t("Wyślij je klientowi razem z linkiem. Usuń, jeśli galeria ma być otwarta.", "Send it to your client with the link. Clear it if the gallery should be open.")}</p>

          <fieldset className="layout-pick">
            <legend>{t("Układ zdjęć", "Photo layout")}</legend>
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
              <span className="pick-title">{t("Mozaika", "Mosaic")}</span>
              <span className="pick-desc">{t("Zdjęcia w naturalnych proporcjach", "Photos in natural proportions")}</span>
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
              <span className="pick-title">{t("Siatka", "Grid")}</span>
              <span className="pick-desc">{t("Równe, kwadratowe kadry", "Even, square crops")}</span>
            </label>
          </fieldset>

          <p className="hint">{t("Najpierw prześlij zdjęcia. Pakiet i cenę wybierzesz przy publikacji, gdy będzie wiadomo, ile miejsca zajmuje galeria.", "Upload your photos first. You choose the plan and price when publishing, once the gallery size is known.")}</p>

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          <div className="modal-actions">
            <button type="button" className="as-link" onClick={close}>
              {t("Anuluj", "Cancel")}
            </button>
            <button type="submit" className="btn" disabled={busy}>
              {busy ? t("Tworzę…", "Creating…") : t("Utwórz galerię", "Create gallery")}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
