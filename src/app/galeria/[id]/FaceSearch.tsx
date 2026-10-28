"use client";

import { useRef, useState } from "react";
import { T, type Lang } from "@/lib/i18n";
import { selfieDescriptor } from "@/lib/faces-client";

// Przycisk „Znajdź siebie” na pasku galerii: selfie → opis twarzy → zdjęcia z tą osobą
export default function FaceSearch({ galleryId, guestToken, lang = "pl" }: { galleryId: string; guestToken?: string; lang?: Lang }) {
  const t = T[lang];
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"idle" | "loading" | "searching">("idle");
  const [message, setMessage] = useState("");

  async function run(file?: File) {
    if (!file) return;
    if (cameraRef.current) cameraRef.current.value = "";
    if (fileRef.current) fileRef.current.value = "";
    setMessage("");
    setState("loading");
    try {
      const d = await selfieDescriptor(file);
      if (!d) {
        setMessage(t.faceNoFace);
        setState("idle");
        return;
      }
      setState("searching");
      const res = await fetch(`/api/galleries/${galleryId}/faces`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "search", descriptor: d, guestToken }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? t.faceError);
      if (!data.names.length) {
        setMessage(t.faceNone);
        setState("idle");
        return;
      }
      window.dispatchEvent(new CustomEvent("lenslie:faces", { detail: data.names }));
      dialogRef.current?.close();
      setState("idle");
      document.getElementById("zdjecia")?.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      setMessage(err instanceof Error && err.message !== "img" ? err.message : t.faceError);
      setState("idle");
    }
  }

  return (
    <>
      <button
        type="button"
        className="g-face-btn"
        onClick={() => {
          setMessage("");
          dialogRef.current?.showModal();
        }}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <circle cx="12" cy="10" r="4" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5 20c1.2-3.4 4-5 7-5s5.8 1.6 7 5M3 7V4h3M21 7V4h-3M3 17v3h3M21 17v3h-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span>{t.findMe}</span>
      </button>
      <dialog ref={dialogRef} className="modal" aria-labelledby="face-title" onClick={(e) => e.target === dialogRef.current && state === "idle" && dialogRef.current?.close()}>
        <div className="modal-body face-modal">
          <h2 id="face-title">{t.faceTitle}</h2>
          <p className="modal-lead">{t.faceLead}</p>
          {state === "idle" ? (
            <div className="face-actions">
              <button type="button" className="btn btn-dark" onClick={() => cameraRef.current?.click()}>
                {t.faceTake}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
                {t.facePick}
              </button>
            </div>
          ) : (
            <p className="face-wait" aria-live="polite">
              <span className="face-spin" aria-hidden="true" />
              {state === "loading" ? t.faceLoading : t.faceSearching}
            </p>
          )}
          {message && <p className="face-msg">{message}</p>}
          <input ref={cameraRef} type="file" accept="image/*" capture="user" hidden onChange={(e) => run(e.target.files?.[0])} />
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => run(e.target.files?.[0])} />
          <p className="face-privacy">{t.facePrivacy}</p>
          <div className="modal-actions">
            <span />
            <button type="button" className="as-link" onClick={() => dialogRef.current?.close()} disabled={state !== "idle"}>
              {t.close}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
