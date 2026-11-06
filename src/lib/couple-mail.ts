// Elegancki mail dla pary młodej: okładka galerii, nazwa studia, hasło, termin – w stylu albumu ślubnego.
// HTML zgodny z programami pocztowymi (tabele, style w linii, czcionki z zapasem Georgia).

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export type CoupleMail = {
  studio: string | null;
  title: string;
  coverUrl: string | null;
  link: string;
  password?: string | null;
  until?: string | null; // już sformatowana data
  en?: boolean;
};

const GOLD = "#b8975f";
const INK = "#3b3633";
const TAUPE = "#958c85";
const SERIF = "'EB Garamond', 'Cormorant Garamond', Georgia, 'Times New Roman', serif";
const SANS = "'Manrope', 'Helvetica Neue', Helvetica, Arial, sans-serif";

export function coupleReminderMail(m: CoupleMail): { subject: string; html: string } {
  const en = Boolean(m.en);
  const studio = m.studio?.trim() || "";
  const L = (pl: string, eng: string) => (en ? eng : pl);
  const subject = en ? `${m.title} – your photos are waiting` : `${m.title} – Wasze zdjęcia czekają`;

  const cover = m.coverUrl
    ? `<tr><td style="padding:0"><a href="${esc(m.link)}" style="text-decoration:none"><img src="${esc(m.coverUrl)}" alt="${esc(m.title)}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0"></a></td></tr>`
    : "";

  const password = m.password
    ? `<tr><td align="center" style="padding:6px 40px 30px">
        <table role="presentation" cellpadding="0" cellspacing="0" style="border:1px solid #e3d5bd;border-collapse:separate">
          <tr><td align="center" style="padding:14px 34px 16px">
            <div style="font-family:${SANS};font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${GOLD};margin:0 0 6px">${L("Hasło do galerii", "Gallery password")}</div>
            <div style="font-family:${SERIF};font-size:24px;letter-spacing:4px;color:${INK}">${esc(m.password)}</div>
          </td></tr>
        </table>
      </td></tr>`
    : "";

  const until = m.until
    ? `<tr><td align="center" style="padding:0 40px 34px;font-family:${SERIF};font-style:italic;font-size:16px;line-height:1.5;color:${TAUPE}">${L(
        `Galeria jest dostępna do ${esc(m.until)} –<br>pobierzcie zdjęcia przed tym terminem.`,
        `The gallery is available until ${esc(m.until)} –<br>please download your photos before then.`,
      )}</td></tr>`
    : "";

  const html = `<!doctype html>
<html lang="${en ? "en" : "pl"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">
<link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;1,400&family=Manrope:wght@400;500&display=swap" rel="stylesheet">
<title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f4eee6">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${L("Wasza galeria zdjęć jest gotowa – zajrzyjcie i wybierzcie ulubione.", "Your photo gallery is ready – have a look and pick your favourites.")}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4eee6">
<tr><td align="center" style="padding:36px 12px 40px">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px">
    ${
      studio
        ? `<tr><td align="center" style="padding:0 0 22px;font-family:${SANS};font-size:11px;letter-spacing:5px;text-transform:uppercase;color:${INK}">${esc(studio)}</td></tr>`
        : ""
    }
    <tr><td style="background:#fffdf9">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${cover}
        <tr><td align="center" style="padding:40px 40px 0">
          <div style="width:44px;height:1px;background:${GOLD};margin:0 auto 22px;line-height:1px;font-size:1px">&nbsp;</div>
          <div style="font-family:${SANS};font-size:10px;letter-spacing:4px;text-transform:uppercase;color:${GOLD}">${L("Wasza galeria", "Your gallery")}</div>
        </td></tr>
        <tr><td align="center" style="padding:14px 40px 18px;font-family:${SERIF};font-size:36px;line-height:1.15;color:${INK};font-weight:400">${esc(m.title)}</td></tr>
        <tr><td align="center" style="padding:0 52px 30px;font-family:${SANS};font-size:15px;line-height:1.75;color:#5d5650">${L(
          "Wasze zdjęcia czekają. Usiądźcie wygodnie, wróćcie do tego dnia, zaznaczcie ulubione kadry serduszkiem i pobierzcie je w pełnej jakości.",
          "Your photos are waiting. Sit back, relive the day, mark your favourite frames with a heart and download them in full quality.",
        )}</td></tr>
        ${password}
        <tr><td align="center" style="padding:0 40px 30px">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td align="center" bgcolor="${INK}" style="background:${INK}">
              <a href="${esc(m.link)}" style="display:inline-block;padding:16px 38px;font-family:${SANS};font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#fbf7f0;text-decoration:none">${L("Zobacz galerię", "View the gallery")}</a>
            </td>
          </tr></table>
        </td></tr>
        ${until}
        ${
          studio
            ? `<tr><td align="center" style="padding:0 40px 42px;font-family:${SERIF};font-size:17px;color:${INK}"><span style="font-style:italic;color:${TAUPE}">${L("Z serdecznymi pozdrowieniami,", "With warm wishes,")}</span><br>${esc(studio)}</td></tr>`
            : `<tr><td style="padding:0 0 12px"></td></tr>`
        }
      </table>
    </td></tr>
    <tr><td align="center" style="padding:22px 30px 0;font-family:${SANS};font-size:11px;line-height:1.7;color:#a69c94">
      ${L("Jeśli przycisk nie działa, skopiujcie ten adres:", "If the button doesn't work, copy this address:")}<br>
      <a href="${esc(m.link)}" style="color:#a69c94">${esc(m.link)}</a><br><br>
      <span style="letter-spacing:2px;text-transform:uppercase;font-size:9px">${L("Galeria online", "Online gallery")} · <a href="https://www.lenslie.com" style="color:#a69c94;text-decoration:none">Lenslie</a></span>
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`;
  return { subject, html };
}
