"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTr } from "@/components/LangProvider";
import { canvasToJpeg } from "@/lib/watermark-client";

// Miniatura okładki w panelu galerii: wgranie własnej okładki albo wybór gwiazdką przy zdjęciu
export default function CoverCard({ id, src, custom }: { id: string; src: string | null; custom: boolean }) {
  const t = useTr();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const api = async (body: Record<string, unknown>) => {
    const res = await fetch(`/api/galleries/${id}/cover`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Error");
    return data;
  };

  // Zmniejszamy w przeglądarce do 2400 px i wysyłamy prosto do magazynu
  async function upload(file?: File) {
    if (input.current) input.current.value = "";
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
      const scale = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bmp.width * scale);
      canvas.height = Math.round(bmp.height * scale);
      canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
      const blob = await canvasToJpeg(canvas);
      const { url } = await api({ action: "upload-url" });
      const put = await fetch(url, { method: "PUT", body: blob, headers: { "Content-Type": "image/jpeg" } });
      if (!put.ok) throw new Error(t("Nie udało się przesłać zdjęcia.", "Could not upload the photo."));
      await api({ action: "upload-done" });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Nie udało się przesłać zdjęcia.", "Could not upload the photo."));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError("");
    try {
      await api({ action: "remove-upload" });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="g-side-cover-wrap">
      <button type="button" className="g-side-cover cover-pick" onClick={() => input.current?.click()} disabled={busy} title={t("Wgraj własną okładkę", "Upload your own cover")}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" />
        ) : (
          <span>{t("Okładką zostanie pierwsze zdjęcie.", "The first photo will be the cover.")}</span>
        )}
        <span className="cover-pick-label">{busy ? t("Wgrywam…", "Uploading…") : t("Okładka · wgraj zdjęcie", "Cover · upload a photo")}</span>
      </button>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0])} />
      <p className="cover-hint">
        {custom ? (
          <>
            {t("Własna okładka.", "Custom cover.")}{" "}
            <button type="button" className="as-link" onClick={remove} disabled={busy}>
              {t("Wróć do zdjęcia z galerii", "Use a gallery photo")}
            </button>
          </>
        ) : (
          t("Kliknij, aby wgrać okładkę, albo wybierz gwiazdką przy zdjęciu.", "Click to upload a cover, or pick one with the star on a photo.")
        )}
      </p>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
