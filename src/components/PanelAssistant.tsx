"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import { useTr } from "@/components/LangProvider";

type Msg = { role: "user" | "assistant"; content: string };
export type AssistantMode = "panel" | "site";

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

const SUGGESTIONS: Record<AssistantMode, [string, string][]> = {
  panel: [
    ["Jak wysłać galerię klientowi?", "How do I send a gallery to my client?"],
    ["Jak podpiąć własną domenę?", "How do I connect my own domain?"],
    ["Jak działa sprzedaż zdjęć?", "How do photo sales work?"],
  ],
  site: [
    ["Ile zapłacę za galerię ślubną?", "How much is a wedding gallery?"],
    ["Czym Lenslie różni się od Pixieset?", "How is Lenslie different from Pixieset?"],
    ["Czy klient może wybrać zdjęcia do albumu?", "Can my client pick photos for an album?"],
  ],
};

// Asystent AI – pływający przycisk i okienko rozmowy. „panel” – dla zalogowanego fotografa, „site” – na stronie Lenslie.
export default function PanelAssistant({ mode = "panel" }: { mode?: AssistantMode }) {
  const t = useTr();
  const STORE = `lenslie_assistant_${mode}_v1`;
  const endpoint = mode === "site" ? "/api/assistant/site" : "/api/assistant";
  const [contact, setContact] = useState({ show: false, email: "", agree: false });
  const [idea, setIdea] = useState<{ show: boolean; text: string; sent: boolean }>({ show: false, text: "", sent: false });

  async function sendIdea() {
    if (idea.text.trim().length < 5) return setError(t("Opisz pomysł w kilku słowach.", "Describe your idea in a few words."));
    setError("");
    const res = await fetch("/api/assistant/idea", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: idea.text }) }).catch(() => null);
    if (res?.ok) setIdea({ show: false, text: "", sent: true });
    else setError(t("Nie udało się wysłać – spróbuj ponownie.", "Could not send – try again."));
  }
  const [open, setOpen] = useState(false);
  // zminimalizowany czat: zostaje tylko mała zakładka przy krawędzi ekranu (zapamiętane w tej przeglądarce)
  const HIDE = `lenslie_assistant_hidden_${mode}`;
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    try {
      setHidden(localStorage.getItem(HIDE) === "1");
    } catch {}
  }, [HIDE]);
  const minimize = (v: boolean) => {
    setHidden(v);
    if (v) setOpen(false);
    try {
      if (v) localStorage.setItem(HIDE, "1");
      else localStorage.removeItem(HIDE);
    } catch {}
  };
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
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next }) });
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
    if (mode === "site") {
      // na stronie: najpierw e-mail i zgoda, żeby Adam mógł odpisać
      if (!contact.show) return setContact({ ...contact, show: true });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())) return setError(t("Wpisz poprawny e-mail.", "Enter a valid e-mail."));
      if (!contact.agree) return setError(t("Zaznacz zgodę na kontakt.", "Please agree to be contacted."));
    } else if (!msgs.length) return;
    setError("");
    const res = await fetch(mode === "site" ? "/api/assistant/lead" : "/api/assistant/handoff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: msgs, email: contact.email.trim() }),
    }).catch(() => null);
    if (res?.ok) {
      setSent(true);
      setContact({ show: false, email: "", agree: false });
    } else setError(t("Nie udało się wysłać – spróbuj ponownie.", "Could not send – try again."));
  }

  if (hidden)
    return (
      <button type="button" className="pa-mini" onClick={() => minimize(false)} aria-label={t("Pokaż asystenta Lenslie", "Show the Lenslie assistant")} title={t("Asystent Lenslie", "Lenslie assistant")}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192.png" alt="" width={48} height={48} />
        <i aria-hidden="true" />
      </button>
    );

  return (
    <div className={open ? "pa pa-open" : "pa"}>
      {open && (
        <section className="pa-box" aria-label={t("Asystent Lenslie", "Lenslie assistant")}>
          <header className="pa-head">
            <span className="pa-ava" aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon-192.png" alt="" width={36} height={36} />
              <i />
            </span>
            <div className="pa-title">
              <b>{t("Asystent Lenslie", "Lenslie assistant")}</b>
              <span>
                {mode === "site"
                  ? t("Odpowiada AI – pytaj o funkcje i ceny", "Answered by AI – ask about features and pricing")
                  : t("Odpowiada AI – sprawdza Twoje galerie, niczego nie zmienia", "Answered by AI – it looks at your galleries but changes nothing")}
              </span>
            </div>
            <button type="button" className="pa-x" onClick={() => minimize(true)} aria-label={t("Ukryj czat", "Hide chat")} title={t("Ukryj czat – zostanie mała ikonka przy krawędzi", "Hide chat – a small icon stays at the edge")}>
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                <path d="M6 12h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <button type="button" className="pa-x" onClick={() => setOpen(false)} aria-label={t("Zamknij", "Close")}>
              ×
            </button>
          </header>

          <div className="pa-list" ref={list}>
            {msgs.length === 0 && (
              <div className="pa-hello">
                <p>
                  {mode === "site"
                    ? t("Cześć! Jestem asystentem Lenslie. Powiem, jak działają galerie dla klientów, ile kosztują i który pakiet pasuje do Twoich sesji.", "Hi! I'm the Lenslie assistant. I'll explain how client galleries work, what they cost and which package fits your sessions.")
                    : t("Cześć! Zapytaj o cokolwiek w Lenslie – gdzie coś kliknąć, jak coś działa albo co się dzieje z Twoją galerią.", "Hi! Ask anything about Lenslie – where to click, how something works or what's going on with your gallery.")}
                </p>
                <div className="pa-sugg">
                  {SUGGESTIONS[mode].map(([pl, en]) => (
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
            {busy && (
              <div className="pa-msg pa-assistant pa-typing" aria-label={t("Piszę odpowiedź…", "Writing an answer…")}>
                <i />
                <i />
                <i />
              </div>
            )}
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
              rows={1}
              maxLength={2000}
              placeholder={t("Napisz pytanie…", "Type your question…")}
              aria-label={t("Pytanie", "Question")}
            />
            <button type="submit" className="pa-send" disabled={busy || !input.trim()} aria-label={t("Wyślij", "Send")}>
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </form>
          {idea.show && (
            <div className="pa-contact pa-idea">
              <b>{t("Masz pomysł na nową funkcję?", "Got an idea for a new feature?")}</b>
              <textarea
                value={idea.text}
                onChange={(e) => setIdea({ ...idea, text: e.target.value })}
                rows={3}
                maxLength={3000}
                placeholder={t("Napisz, czego brakuje Ci w Lenslie albo co by Ci ułatwiło pracę…", "Tell us what's missing in Lenslie or what would make your work easier…")}
                aria-label={t("Pomysł", "Idea")}
              />
              <div className="pa-idea-row">
                <button type="button" className="btn btn-dark btn-small" onClick={sendIdea}>
                  {t("Wyślij pomysł", "Send idea")}
                </button>
                <button type="button" className="as-link" onClick={() => setIdea({ ...idea, show: false })}>
                  {t("Anuluj", "Cancel")}
                </button>
              </div>
            </div>
          )}
          {idea.sent && !idea.show && <p className="pa-thanks">{t("Dziękujemy! Pomysł trafił do zespołu Lenslie.", "Thank you! Your idea has reached the Lenslie team.")}</p>}
          {contact.show && !sent && (
            <div className="pa-contact">
              <input
                type="email"
                value={contact.email}
                onChange={(e) => setContact({ ...contact, email: e.target.value })}
                placeholder={t("Twój e-mail", "Your e-mail")}
                aria-label={t("Twój e-mail", "Your e-mail")}
              />
              <label>
                <input type="checkbox" checked={contact.agree} onChange={(e) => setContact({ ...contact, agree: e.target.checked })} />
                {t("Zgadzam się na kontakt mailowy w sprawie Lenslie (rozmowa trafi do obsługi Lenslie).", "I agree to be contacted by e-mail about Lenslie (the chat goes to Lenslie support).")}
              </label>
              <button type="button" className="btn btn-dark btn-small" onClick={handoff}>
                {t("Wyślij", "Send")}
              </button>
            </div>
          )}
          <div className="pa-foot">
            {sent ? (
              <span>{t("Wysłane – odpiszemy mailem.", "Sent – we'll reply by e-mail.")}</span>
            ) : mode === "site" ? (
              <button type="button" className="as-link" onClick={() => setContact({ ...contact, show: !contact.show })}>
                {t("Porozmawiaj z człowiekiem", "Talk to a human")}
              </button>
            ) : (
              <button type="button" className="as-link" onClick={handoff} disabled={!msgs.length}>
                {t("Napisz do obsługi Lenslie", "Contact Lenslie support")}
              </button>
            )}
            {mode === "panel" && (
              <button type="button" className="as-link pa-idea-btn" onClick={() => setIdea({ ...idea, show: !idea.show, sent: false })}>
                💡 {t("Zgłoś pomysł", "Suggest an idea")}
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
      {!open && (
        <button type="button" className="pa-hide" onClick={() => minimize(true)} aria-label={t("Ukryj czat", "Hide chat")} title={t("Ukryj czat", "Hide chat")}>
          ×
        </button>
      )}
      <button type="button" className="pa-fab" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {open ? (
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">
            <path d="M12 3.5l1.6 4.2 4.4 1.6-4.4 1.6L12 15.1l-1.6-4.2-4.4-1.6 4.4-1.6L12 3.5Z" fill="currentColor" />
            <path d="M18.5 14.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z" fill="currentColor" opacity=".75" />
          </svg>
        )}
        <span>{open ? t("Zamknij", "Close") : t("Zapytaj Lenslie", "Ask Lenslie")}</span>
      </button>
    </div>
  );
}
