"use client";

import { useState } from "react";
import { useTr } from "@/components/LangProvider";

const MAX = 10;

// Filmy z YouTube na górze galerii: włącznik i lista linków
export default function YouTubeCard({ id, enabled: initialOn, links: initialLinks }: { id: string; enabled: boolean; links: string[] }) {
  const t = useTr();
  const [on, setOn] = useState(initialOn);
  const [links, setLinks] = useState<string[]>(initialLinks.length ? initialLinks : [""]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(nextOn = on, nextLinks = links) {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/galleries/${id}/youtube`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: nextOn, links: nextLinks }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(false);
    if (!res?.ok) {
      setMsg({ ok: false, text: data?.error ?? t("Nie udało się zapisać.", "Could not save.") });
      return false;
    }
    setMsg({ ok: true, text: t("Zapisano.", "Saved.") });
    return true;
  }

  async function toggle(next: boolean) {
    setOn(next);
    if (!(await save(next))) setOn(!next);
  }

  const setAt = (i: number, v: string) => setLinks(links.map((l, j) => (j === i ? v : l)));
  const removeAt = (i: number) => {
    const next = links.filter((_, j) => j !== i);
    setLinks(next.length ? next : [""]);
  };

  return (
    <div className="settings-card yt-card">
      <h2>{t("Filmy z YouTube", "YouTube videos")}</h2>
      <p>
        {t(
          "Wklej link do filmu na YouTube (np. teledysku z wesela) – klient obejrzy go na samej górze galerii. Film może być niepubliczny („dostęp przez link”).",
          "Paste a YouTube link (e.g. a wedding highlight film) – your client watches it at the very top of the gallery. The video can be unlisted.",
        )}
      </p>
      <label className="check">
        <input type="checkbox" checked={on} disabled={busy} onChange={(e) => toggle(e.target.checked)} />
        {t("Pokazuj filmy z YouTube w galerii", "Show YouTube videos in the gallery")}
      </label>
      <div className="yt-links">
        {links.map((l, i) => (
          <div key={i} className="yt-row">
            <input
              type="url"
              value={l}
              placeholder="https://youtu.be/…"
              onChange={(e) => setAt(i, e.target.value)}
              aria-label={`${t("Link do filmu", "Video link")} ${i + 1}`}
            />
            {(links.length > 1 || l) && (
              <button type="button" className="as-link danger" onClick={() => removeAt(i)}>
                {t("Usuń", "Remove")}
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="yt-actions">
        {links.length < MAX && (
          <button type="button" className="btn btn-ghost btn-small" onClick={() => setLinks([...links, ""])}>
            + {t("Dodaj kolejny link", "Add another link")}
          </button>
        )}
        <button type="button" className="btn btn-dark btn-small" disabled={busy} onClick={() => save()}>
          {busy ? t("Zapisuję…", "Saving…") : t("Zapisz linki", "Save links")}
        </button>
      </div>
      {msg && <p className={msg.ok ? "hint-inline" : "error"}>{msg.text}</p>}
    </div>
  );
}
