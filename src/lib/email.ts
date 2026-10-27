// Wysyłka e-maili przez Resend (https://resend.com). Bez klucza RESEND_API_KEY nic nie wysyła i zwraca false.
export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Lenslie <powiadomienia@lenslie.com>";
  if (!key || !to) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function siteUrl() {
  return (process.env.SITE_URL ?? "https://www.lenslie.com").replace(/\/$/, "");
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// Prosty, elegancki szablon wiadomości w stylu Lenslie
export function emailLayout(title: string, paragraphs: string[], button?: { label: string; url: string }) {
  return `<!doctype html><html lang="pl"><body style="margin:0;background:#f8f4f1;font-family:Helvetica,Arial,sans-serif;color:#3b3633">
<div style="max-width:560px;margin:0 auto;padding:40px 24px">
<p style="font-family:Georgia,serif;font-size:24px;letter-spacing:.04em;margin:0 0 28px">Lenslie</p>
<div style="background:#fff;border-radius:10px;padding:32px 28px">
<h1 style="font-family:Georgia,serif;font-weight:400;font-size:24px;margin:0 0 18px">${esc(title)}</h1>
${paragraphs.map((p) => `<p style="font-size:15px;line-height:1.6;margin:0 0 14px">${esc(p)}</p>`).join("")}
${button ? `<p style="margin:26px 0 4px"><a href="${esc(button.url)}" style="display:inline-block;background:#3b3633;color:#fff;text-decoration:none;padding:12px 26px;border-radius:999px;font-size:14px">${esc(button.label)}</a></p>` : ""}
</div>
<p style="font-size:12px;color:#958c85;margin:20px 0 0">Wiadomość wysłana automatycznie przez Lenslie.</p>
</div></body></html>`;
}
