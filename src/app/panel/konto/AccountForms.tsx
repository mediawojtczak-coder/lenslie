"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

async function call(body: unknown) {
  const res = await fetch("/api/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Coś poszło nie tak.");
  return data;
}

export default function AccountForms({
  email,
  studioName: initialName,
  logoUrl,
}: {
  email: string;
  studioName: string;
  logoUrl: string | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [studioName, setStudioName] = useState(initialName);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ form: string; text: string; ok: boolean } | null>(null);

  async function run(form: string, fn: () => Promise<string>) {
    setBusy(form);
    setMsg(null);
    try {
      const text = await fn();
      setMsg({ form, text, ok: true });
      router.refresh();
    } catch (err) {
      setMsg({ form, text: err instanceof Error ? err.message : "Coś poszło nie tak.", ok: false });
    } finally {
      setBusy(null);
    }
  }

  const note = (form: string) =>
    msg?.form === form ? (
      <p className={msg.ok ? "success" : "error"} role={msg.ok ? undefined : "alert"}>
        {msg.text}
      </p>
    ) : null;

  function uploadLogo(file?: File) {
    if (!file) return;
    run("logo", async () => {
      const { url, key } = await call({ action: "logo-url", type: file.type, size: file.size });
      const put = await fetch(url, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!put.ok) throw new Error("Nie udało się przesłać logo.");
      await call({ action: "logo-done", key });
      if (fileRef.current) fileRef.current.value = "";
      return "Logo zapisane.";
    });
  }

  return (
    <>
      <form
        className="settings-card"
        onSubmit={(e) => {
          e.preventDefault();
          run("studio", async () => {
            await call({ action: "save", studioName });
            return "Zapisano.";
          });
        }}
      >
        <h2>Twoje studio</h2>
        <p>Nazwa i logo pojawiają się w galeriach Twoich klientów zamiast napisu Lenslie.</p>
        <label htmlFor="studio">Nazwa studia lub fotografa</label>
        <input
          id="studio"
          value={studioName}
          maxLength={80}
          onChange={(e) => setStudioName(e.target.value)}
          placeholder="np. Anna Nowak Fotografia"
        />
        {note("studio")}
        <button type="submit" className="btn" disabled={busy !== null}>
          {busy === "studio" ? "Zapisuję…" : "Zapisz"}
        </button>
      </form>

      <div className="settings-card">
        <h2>Logo</h2>
        <p>PNG z przezroczystym tłem wygląda najlepiej. Maksymalnie 2 MB.</p>
        <div className="logo-row">
          <div className="logo-preview">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Twoje logo" />
            ) : (
              <span>Brak logo</span>
            )}
          </div>
          <div className="logo-actions">
            <button type="button" className="btn btn-ghost btn-small" onClick={() => fileRef.current?.click()} disabled={busy !== null}>
              {busy === "logo" ? "Przesyłam…" : logoUrl ? "Zmień logo" : "Dodaj logo"}
            </button>
            {logoUrl && (
              <button
                type="button"
                className="as-link"
                disabled={busy !== null}
                onClick={() =>
                  run("logo", async () => {
                    await call({ action: "logo-remove" });
                    return "Logo usunięte.";
                  })
                }
              >
                Usuń logo
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={(e) => uploadLogo(e.target.files?.[0])}
          />
        </div>
        {note("logo")}
      </div>

      <form
        className="settings-card"
        onSubmit={(e) => {
          e.preventDefault();
          run("password", async () => {
            await call({ action: "password", password });
            setPassword("");
            return "Hasło zmienione.";
          });
        }}
      >
        <h2>Logowanie</h2>
        <p>Konto: {email}</p>
        <label htmlFor="new-pass">Nowe hasło</label>
        <input
          id="new-pass"
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Co najmniej 8 znaków"
        />
        {note("password")}
        <button type="submit" className="btn" disabled={busy !== null || password.length < 8}>
          {busy === "password" ? "Zmieniam…" : "Zmień hasło"}
        </button>
      </form>
    </>
  );
}
