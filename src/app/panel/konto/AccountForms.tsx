"use client";

import { useTr } from "@/components/LangProvider";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import InvoiceFields from "@/components/InvoiceFields";
import type { Billing } from "@/lib/billing";

async function call(body: unknown) {
  const res = await fetch("/api/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Error");
  return data;
}

export default function AccountForms({
  email,
  studioName: initialName,
  logoUrl,
  billing: initialBilling,
  section = "studio",
}: {
  section?: "studio" | "billing" | "password";
  email: string;
  studioName: string;
  logoUrl: string | null;
  billing: Billing;
}) {
  const [billing, setBilling] = useState<Billing>(initialBilling);
  const router = useRouter();
  const t = useTr();
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
      setMsg({ form, text: err instanceof Error ? err.message : t("Coś poszło nie tak.", "Something went wrong."), ok: false });
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
      if (!put.ok) throw new Error(t("Nie udało się przesłać logo.", "Could not upload the logo."));
      await call({ action: "logo-done", key });
      if (fileRef.current) fileRef.current.value = "";
      return t("Logo zapisane.", "Logo saved.");
    });
  }

  return (
    <>
      {section === "studio" && (
      <>
      <form
        className="settings-card"
        onSubmit={(e) => {
          e.preventDefault();
          run("studio", async () => {
            await call({ action: "save", studioName });
            return t("Zapisano.", "Saved.");
          });
        }}
      >
        <h2>{t("Twoje studio", "Your studio")}</h2>
        <p>{t("Nazwa i logo pojawiają się w galeriach Twoich klientów zamiast napisu Lenslie.", "Your name and logo appear in your clients' galleries instead of Lenslie.")}</p>
        <label htmlFor="studio">{t("Nazwa studia lub fotografa", "Studio or photographer name")}</label>
        <input
          id="studio"
          value={studioName}
          maxLength={80}
          onChange={(e) => setStudioName(e.target.value)}
          placeholder={t("np. Anna Nowak Fotografia", "e.g. Anna Smith Photography")}
        />
        {note("studio")}
        <button type="submit" className="btn" disabled={busy !== null}>
          {busy === "studio" ? t("Zapisuję…", "Saving…") : t("Zapisz", "Save")}
        </button>
      </form>

      <div className="settings-card">
        <h2>Logo</h2>
        <p>{t("PNG z przezroczystym tłem wygląda najlepiej. Maksymalnie 2 MB.", "A PNG with a transparent background looks best. Up to 2 MB.")}</p>
        <div className="logo-row">
          <div className="logo-preview">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={t("Twoje logo", "Your logo")} />
            ) : (
              <span>{t("Brak logo", "No logo")}</span>
            )}
          </div>
          <div className="logo-actions">
            <button type="button" className="btn btn-ghost btn-small" onClick={() => fileRef.current?.click()} disabled={busy !== null}>
              {busy === "logo" ? t("Przesyłam…", "Uploading…") : logoUrl ? t("Zmień logo", "Change logo") : t("Dodaj logo", "Add logo")}
            </button>
            {logoUrl && (
              <button
                type="button"
                className="as-link"
                disabled={busy !== null}
                onClick={() =>
                  run("logo", async () => {
                    await call({ action: "logo-remove" });
                    return t("Logo usunięte.", "Logo removed.");
                  })
                }
              >
                {t("Usuń logo", "Remove logo")}
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
      </>
      )}

      {section === "billing" && (
      <form
        className="settings-card"
        onSubmit={(e) => {
          e.preventDefault();
          run("billing", async () => {
            await call({ action: "billing", billing });
            return t("Dane do faktury zapisane.", "Invoice details saved.");
          });
        }}
      >
        <h2>{t("Dane do faktury", "Invoice details")}</h2>
        <p>{t("Podpowiemy je przy każdym zakupie. Fakturę wyślemy na adres e-mail konta.", "We'll prefill them for every purchase. The invoice is sent to your account email.")}</p>
        <InvoiceFields value={billing} onChange={setBilling} alwaysOpen />
        {note("billing")}
        <button type="submit" className="btn" disabled={busy !== null}>
          {busy === "billing" ? t("Zapisuję…", "Saving…") : t("Zapisz dane", "Save details")}
        </button>
      </form>
      )}

      {section === "password" && (
      <form
        className="settings-card"
        onSubmit={(e) => {
          e.preventDefault();
          run("password", async () => {
            await call({ action: "password", password });
            setPassword("");
            return t("Hasło zmienione.", "Password changed.");
          });
        }}
      >
        <h2>{t("Logowanie", "Sign-in")}</h2>
        <p>{t("Konto", "Account")}: {email}</p>
        <label htmlFor="new-pass">{t("Nowe hasło", "New password")}</label>
        <input
          id="new-pass"
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t("Co najmniej 8 znaków", "At least 8 characters")}
        />
        {note("password")}
        <button type="submit" className="btn" disabled={busy !== null || password.length < 8}>
          {busy === "password" ? t("Zmieniam…", "Changing…") : t("Zmień hasło", "Change password")}
        </button>
      </form>
      )}
    </>
  );
}
