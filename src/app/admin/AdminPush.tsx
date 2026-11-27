"use client";

import { useEffect, useState } from "react";

// Włączanie powiadomień push (nowi fotografowie, sprzedaż) na tym urządzeniu – tylko w panelu administratora
const b64ToBytes = (b64: string) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

type State = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on";

export default function AdminPush({ devices }: { devices: number }) {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
      const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        return setState(ios && !standalone ? "ios-install" : "unsupported");
      }
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, []);

  async function enable() {
    setBusy(true);
    setMsg("");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "off");
        return;
      }
      const { publicKey } = (await (await fetch("/api/admin/push")).json()) as { publicKey: string };
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(publicKey) }));
      const label = /iPhone/.test(navigator.userAgent) ? "iPhone" : /iPad/.test(navigator.userAgent) ? "iPad" : /Android/.test(navigator.userAgent) ? "Android" : /Mac/.test(navigator.userAgent) ? "Mac" : "Komputer";
      const res = await fetch("/api/admin/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "subscribe", sub: sub.toJSON(), label }) });
      if (!res.ok) throw new Error();
      setState("on");
      setMsg("Włączone. Wysyłam powiadomienie testowe…");
      await fetch("/api/admin/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "test" }) });
    } catch {
      setMsg("Nie udało się włączyć powiadomień. Spróbuj jeszcze raz.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMsg("");
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/admin/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "unsubscribe", endpoint: sub.endpoint }) });
        await sub.unsubscribe();
      }
      setState("off");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    await fetch("/api/admin/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "test" }) }).catch(() => undefined);
    setMsg("Wysłane – powinno przyjść za kilka sekund.");
    setBusy(false);
  }

  return (
    <div className="admin-push">
      {state === "loading" && <p className="hint-inline">Sprawdzam…</p>}
      {state === "on" && (
        <>
          <p>✅ Powiadomienia są włączone na tym urządzeniu.</p>
          <div className="admin-push-btns">
            <button type="button" className="btn" onClick={test} disabled={busy}>Wyślij test</button>
            <button type="button" className="btn btn-ghost" onClick={disable} disabled={busy}>Wyłącz na tym urządzeniu</button>
          </div>
        </>
      )}
      {state === "off" && (
        <button type="button" className="btn btn-dark" onClick={enable} disabled={busy}>
          {busy ? "Włączam…" : "Włącz powiadomienia na tym urządzeniu"}
        </button>
      )}
      {state === "ios-install" && (
        <p>
          Na iPhonie powiadomienia działają tylko w zainstalowanej aplikacji: w Safari kliknij <strong>Udostępnij</strong> →{" "}
          <strong>Do ekranu początkowego</strong>, otwórz Lenslie z ikony, zaloguj się i wejdź tutaj jeszcze raz.
        </p>
      )}
      {state === "denied" && (
        <p>Powiadomienia są zablokowane dla Lenslie. Włącz je w ustawieniach telefonu (Ustawienia → Powiadomienia → Lenslie) albo przeglądarki i odśwież stronę.</p>
      )}
      {state === "unsupported" && <p>Ta przeglądarka nie obsługuje powiadomień. Użyj Chrome, Safari (iPhone: z ikony na ekranie początkowym) albo Edge.</p>}
      {msg && <p className="hint-inline">{msg}</p>}
      <p className="hint-inline">
        Przychodzą: nowy fotograf, płatność, zakup z salda, sprzedaż zdjęć kartą, zamówienie albumu. Urządzeń z włączonymi powiadomieniami: {devices}.
      </p>
    </div>
  );
}
