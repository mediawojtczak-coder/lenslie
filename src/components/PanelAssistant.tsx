"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import { useTr } from "@/components/LangProvider";

type Msg = { role: "user" | "assistant"; content: string };
const STORE = "lenslie_assistant_v1";

// Pogrubienia (**…**) i ścieżki panelu (/panel/…) jako linki – reszta zwykłym tekstem
function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\/(?:panel|funkcje|poradnik|cennik)[^\s),.;:!?”"]*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <strong key={i}>{p.slice(2, -2)}</strong>
        ) : p.startsWith("/") ? (
          <Link key={i} href={p} className="pa-link">
            {p}
          </Link>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

const SUGGESTIONS: [string, string][] = [
  ["Jak wysłać galerię klientowi?", "How do I send a gallery to my client?"],
  ["Jak podpiąć własną domenę?", "How do I connect my own domain?"],
  ["Jak działa sprzedaż zdjęć?", "How do photo sales work?"],
];

// Asystent AI w panelu – pływający przycisk i okienko rozmowy
export default function PanelAssistant() {
  const t = useTr();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const list = useRef<HTMLDivElement>(null);

  // rozmowa zostaje po przejściu na inną stronę panelu (tylko w tej przeglądarce)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORE);
      if (raw) setMsgs(JSON.parse(raw));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(STORE, JSON.stringify(msgs.slice(-30)));
    } catch {}
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" });
  }, [msgs, busy]);

  async function ask(q: string) {
    const question = q.trim();
    if (!question || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: question }];
    setMsgs(next);
    setInput("");
    setError("");
    setSent(false);
    setBusy(true);
    try {
      const res = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next }) });
      const data = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
      if (!res.ok || !data.text) throw new Error(data.error || t("Asystent chwilowo nie odpowiada.", "The assistant is not responding right now."));
      setMsgs([...next, { role: "assistant", content: data.text }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function handoff() {
    if (!msgs.length) return;
    const res = await fetch("/api/assistant/handoff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: msgs }) }).catch(() => null);
    if (res?.ok) setSent(true);
    else setError(t("Nie udało się wysłać – spróbuj ponownie.", "Could not send – try again."));
  }

  return (
    <div className={open ? "pa pa-open" : "pa"}>
      {open && (
        <section className="pa-box" aria-label={t("Asystent Lenslie", "Lenslie assistant")}>
          <header className="pa-head">
            <div>
              <b>{t("Asystent Lenslie", "Lenslie assistant")}</b>
              <span>{t("Odpowiada AI – sprawdza Twoje galerie, niczego nie zmienia", "Answered by AI – it looks at your galleries but changes nothing")}</span>
            </div>
            <button type="button" className="pa-x" onClick={() => setOpen(false)} aria-label={t("Zamknij", "Close")}>
              ×
            </button>
          </header>

          <div className="pa-list" ref={list}>
            {msgs.length === 0 && (
              <div className="pa-hello">
                <p>{t("Cześć! Zapytaj o cokolwiek w Lenslie – gdzie coś kliknąć, jak coś działa albo co się dzieje z Twoją galerią.", "Hi! Ask anything about Lenslie – where to click, how something works or what's going on with your gallery.")}</p>
                <div className="pa-sugg">
                  {SUGGESTIONS.map(([pl, en]) => (
                    <button key={pl} type="button" onClick={() => ask(t(pl, en))}>
                      {t(pl, en)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={`pa-msg pa-${m.role}`}>
                {m.content.split("\n").map((line, j) => (
                  <p key={j}>
                    <Rich text={line} />
                  </p>
                ))}
              </div>
            ))}
            {busy && <div className="pa-msg pa-assistant pa-typing">{t("Piszę odpowiedź…", "Writing an answer…")}</div>}
            {error && <p className="pa-error">{error}</p>}
          </div>

          <form
            className="pa-form"
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  ask(input);
                }
              }}
              rows={2}
              maxLength={2000}
              placeholder={t("Napisz pytanie…", "Type your question…")}
              aria-label={t("Pytanie", "Question")}
            />
            <button type="submit" className="btn btn-dark btn-small" disabled={busy || !input.trim()}>
              {t("Wyślij", "Send")}
            </button>
          </form>
          <div className="pa-foot">
            {sent ? (
              <span>{t("Wysłane – Adam odpisze mailem.", "Sent – Adam will reply by e-mail.")}</span>
            ) : (
              <button type="button" className="as-link" onClick={handoff} disabled={!msgs.length}>
                {t("Wyślij rozmowę do Adama", "Send this conversation to Adam")}
              </button>
            )}
            {msgs.length > 0 && (
              <button
                type="button"
                className="as-link"
                onClick={() => {
                  setMsgs([]);
                  setError("");
                  setSent(false);
                }}
              >
                {t("Nowa rozmowa", "New chat")}
              </button>
            )}
          </div>
        </section>
      )}
      <button type="button" className="pa-fab" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M4.5 6.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H11l-4 3v-3h-.5a2 2 0 0 1-2-2v-8Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M9 10.5h.01M12 10.5h.01M15 10.5h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span>{open ? t("Zamknij", "Close") : t("Zapytaj Lenslie", "Ask Lenslie")}</span>
      </button>
    </div>
  );
}
