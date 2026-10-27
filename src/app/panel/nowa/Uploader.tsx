"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Upload = { name: string; type: string; originalUrl: string; webUrl: string };

const WEB_MAX = 2048; // dłuższy bok wersji do oglądania

function toSlug(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// Tworzy lżejszą wersję zdjęcia do galerii (JPEG, max 2048 px)
async function makeWebVersion(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, WEB_MAX / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Brak obsługi canvas");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Błąd konwersji"))), "image/jpeg", 0.85),
  );
}

async function put(url: string, body: Blob, type: string) {
  const res = await fetch(url, { method: "PUT", body, headers: { "Content-Type": type } });
  if (!res.ok) throw new Error(`Wgrywanie nie powiodło się (${res.status})`);
}

export default function Uploader({
  initialName = "",
  galleryId,
}: {
  initialName?: string;
  galleryId?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [clientPassword, setClientPassword] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [done, setDone] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<string | null>(null);

  const slug = galleryId ?? toSlug(name);

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);
    if (!slug) return setError("Wpisz nazwę galerii.");
    if (files.length === 0) return setError("Wybierz zdjęcia do wgrania.");

    setBusy(true);
    setDone(0);
    try {
      // Najpierw zapisujemy tytuł galerii i hasło dla klienta
      const metaRes = await fetch("/api/galleries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gallery: slug, title: name.trim(), clientPassword }),
      });
      const metaData = await metaRes.json();
      if (!metaRes.ok) throw new Error(metaData.error ?? "Błąd serwera");

      // Prosimy serwer o podpisane linki partiami po 50 zdjęć
      for (let start = 0; start < files.length; start += 50) {
        const batch = files.slice(start, start + 50);
        const res = await fetch("/api/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gallery: slug,
            files: batch.map((f) => ({ name: f.name, type: f.type })),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Błąd serwera");
        const uploads: Upload[] = data.uploads;

        // Wgrywamy po 3 zdjęcia naraz
        let next = 0;
        const worker = async () => {
          while (next < batch.length) {
            const i = next++;
            const file = batch[i];
            const u = uploads[i];
            const web = await makeWebVersion(file);
            await put(u.originalUrl, file, u.type);
            await put(u.webUrl, web, "image/jpeg");
            setDone((d) => d + 1);
          }
        };
        await Promise.all([worker(), worker(), worker()]);
      }
      setResult(slug);
      setFiles([]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Coś poszło nie tak.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="uploader" onSubmit={handleUpload}>
      <label htmlFor="nazwa">Nazwa galerii</label>
      <input
        id="nazwa"
        type="text"
        placeholder="np. Anna i Marek"
        value={name}
        onChange={(e) => setName(e.target.value)}
        readOnly={Boolean(galleryId)}
      />
      {slug && <p className="hint">Adres galerii: /galeria/{slug}</p>}

      <label htmlFor="haslo-klienta">Hasło dla klienta (opcjonalne)</label>
      <input
        id="haslo-klienta"
        type="text"
        placeholder="np. anna2026"
        value={clientPassword}
        onChange={(e) => setClientPassword(e.target.value)}
        autoComplete="off"
      />
      <p className="hint">
        Klient wpisze je przy otwieraniu galerii. Zostaw puste, aby nie zmieniać obecnego hasła
        albo zostawić galerię otwartą.
      </p>

      <label htmlFor="pliki">Zdjęcia (JPG, PNG lub WebP)</label>
      <input
        id="pliki"
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
      />

      {files.length > 0 && !busy && (
        <p className="hint">Wybrano zdjęć: {files.length}</p>
      )}

      {busy && (
        <div className="progress" aria-live="polite">
          <div className="bar" style={{ width: `${(done / files.length) * 100}%` }} />
          <p className="hint">
            Wgrywanie: {done} z {files.length}
          </p>
        </div>
      )}

      {error && <p className="error" role="alert">{error}</p>}

      {result && (
        <p className="success">
          Gotowe. <Link href={`/galeria/${result}`}>Otwórz galerię</Link>
        </p>
      )}

      <button className="btn" type="submit" disabled={busy}>
        {busy ? "Wgrywam…" : "Wgraj zdjęcia"}
      </button>
    </form>
  );
}
