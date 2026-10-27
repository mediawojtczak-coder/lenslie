"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTr } from "@/components/LangProvider";

export default function CreateGuestEvent({ label, className }: { label: string; className?: string }) {
  const t = useTr();
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/guest-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", title }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("Nie udało się utworzyć.", "Could not create it."));
      router.push(`/panel/goscie/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Nie udało się utworzyć.", "Could not create it."));
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => {
          setTitle("");
          setError("");
          ref.current?.showModal();
        }}
      >
        {label}
      </button>
      <dialog ref={ref} className="modal" aria-labelledby="nb-title" onClick={(e) => e.target === ref.current && ref.current?.close()}>
        <form className="modal-body" onSubmit={submit}>
          <h2 id="nb-title">{t("Nowe wydarzenie", "New event")}</h2>
          <label htmlFor="nb-name">{t("Nazwa", "Name")}</label>
          <input id="nb-name" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("np. Wesele Anny i Marka", "e.g. Anna & Mark’s wedding")} required autoFocus maxLength={100} />
          <p className="hint">{t("Datę, powitanie i kod QR ustawisz w następnym kroku.", "You’ll set the date, welcome text and QR code in the next step.")}</p>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="modal-actions">
            <button type="button" className="as-link" onClick={() => ref.current?.close()}>
              {t("Anuluj", "Cancel")}
            </button>
            <button type="submit" className="btn" disabled={busy}>
              {busy ? t("Tworzę…", "Creating…") : t("Utwórz", "Create")}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
