"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/components/LangProvider";

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

// Rejestracja aplikacji (service worker) i przycisk „Pobierz aplikację na komputer”
export default function InstallApp({ className = "side-link", label }: { className?: string; label?: string }) {
  const lang = useLang();
  const t = (pl: string, en: string) => (lang === "en" ? en : pl);
  const [prompt, setPrompt] = useState<PromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [help, setHelp] = useState<"safari-mac" | "ios" | "other" | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as PromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  async function install() {
    if (prompt) {
      await prompt.prompt();
      const choice = await prompt.userChoice.catch(() => null);
      if (choice?.outcome === "accepted") setInstalled(true);
      setPrompt(null);
      return;
    }
    // Przeglądarki bez okienka instalacji: krótka instrukcja
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
    const safari = /Safari/.test(ua) && !/Chrome|Chromium|Edg|OPR|Firefox/.test(ua);
    setHelp(ios ? "ios" : safari ? "safari-mac" : "other");
    dialog.current?.showModal();
  }

  return (
    <>
      <button type="button" className={`${className} install-app`} onClick={install}>
        <span>{label ?? t("Aplikacja na komputer", "Desktop app")}</span>
      </button>
      <dialog
        ref={dialog}
        className="modal install-modal"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current?.close();
        }}
      >
        <div className="modal-body">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192.png" alt="" width={56} height={56} className="install-ico" />
          <h2>{t("Zainstaluj Lenslie", "Install Lenslie")}</h2>
          <p className="hint-inline">
            {t(
              "Lenslie otworzy się w osobnym oknie z własną ikoną – jak zwykły program. Aktualizuje się samo.",
              "Lenslie will open in its own window with its own icon – like a regular app. It updates itself.",
            )}
          </p>
          {help === "safari-mac" && (
            <ol className="install-steps">
              <li>{t("W pasku menu Safari kliknij „Plik”.", "In the Safari menu bar, click “File”.")}</li>
              <li>{t("Wybierz „Dodaj do Docka…”.", "Choose “Add to Dock…”.")}</li>
              <li>{t("Kliknij „Dodaj” – ikona Lenslie pojawi się w Docku.", "Click “Add” – the Lenslie icon appears in your Dock.")}</li>
            </ol>
          )}
          {help === "ios" && (
            <ol className="install-steps">
              <li>{t("Stuknij przycisk „Udostępnij” (kwadrat ze strzałką).", "Tap the “Share” button (square with an arrow).")}</li>
              <li>{t("Wybierz „Do ekranu początkowego”.", "Choose “Add to Home Screen”.")}</li>
              <li>{t("Stuknij „Dodaj”.", "Tap “Add”.")}</li>
            </ol>
          )}
          {help === "other" && (
            <ol className="install-steps">
              <li>{t("Otwórz lenslie.com w Chrome albo Edge.", "Open lenslie.com in Chrome or Edge.")}</li>
              <li>{t("Kliknij ikonę instalacji po prawej stronie paska adresu albo w menu „⋮” wybierz „Zainstaluj Lenslie”.", "Click the install icon at the right of the address bar, or choose “Install Lenslie” in the “⋮” menu.")}</li>
            </ol>
          )}
          <button type="button" className="btn btn-dark" onClick={() => dialog.current?.close()}>
            {t("Rozumiem", "Got it")}
          </button>
        </div>
      </dialog>
    </>
  );
}
