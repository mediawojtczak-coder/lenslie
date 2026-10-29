// Filmy z YouTube w galerii (linki) – na razie tylko dla kont z listy
const YT_BETA = ["adamwojtczak7@gmail.com"];
export function ytAllowed(email?: string | null) {
  return Boolean(email && YT_BETA.includes(email.toLowerCase()));
}

export const YT_MAX = 10;
export type YtLink = { url: string; id: string };

// Identyfikator filmu z linku: youtu.be/ID, youtube.com/watch?v=ID, /shorts/ID, /embed/ID, /live/ID
export function ytId(raw: string): string | null {
  const s = raw.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^(www\.|m\.|music\.)/, "");
  let id: string | null = null;
  if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0];
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    id = u.searchParams.get("v");
    const m = /^\/(shorts|embed|live|v)\/([\w-]{11})/.exec(u.pathname);
    if (!id && m) id = m[2];
  }
  return id && /^[\w-]{11}$/.test(id) ? id : null;
}

export const ytEmbed = (id: string) => `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`;
