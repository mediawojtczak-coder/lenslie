"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/components/LangProvider";
import { tr, money, locale } from "@/lib/lang";
import PayButtons from "@/components/PayButtons";
import InvoiceFields from "@/components/InvoiceFields";
import { canvasToJpeg } from "@/lib/watermark-client";
import type { Billing } from "@/lib/billing";
import PortfolioView from "@/components/PortfolioView";
import PortfolioContact from "@/components/PortfolioContact";

type Service = { name: string; price: string; desc: string };
type Site = {
  slug: string;
  title: string;
  tagline: string;
  about: string;
  city: string;
  phone: string;
  instagram: string;
  facebook: string;
  services: Service[];
  showBookings: boolean;
  dark: boolean;
  lang: "pl" | "en";
  consent: boolean;
};

async function api(body: Record<string, unknown>) {
  const res = await fetch("/api/portfolio", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Error");
  return data;
}

// Zmniejsza zdjęcie do 2400 px (JPEG) przed wysłaniem
async function shrink(file: File) {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return canvasToJpeg(c);
}

export default function PortfolioEditor({
  site: initial,
  photos,
  active,
  paidUntil,
  base,
  logo,
  events,
  prices,
  balance,
  billing,
}: {
  site: Site;
  photos: { name: string; url: string }[];
  active: boolean;
  paidUntil: string | null;
  base: string;
  logo: string | null;
  events: { id: string; title: string; price: string; free: number }[];
  prices: Record<number, number>;
  balance: number;
  billing: Billing;
}) {
  const lang = useLang();
  const t = (pl: string, en: string) => tr(lang, pl, en);
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [s, setS] = useState<Site>(initial);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ where: string; ok: boolean; text: string } | null>(null);
  const [months, setMonths] = useState(12);
  const [invoice, setInvoice] = useState<Billing>(billing);
  const [upload, setUpload] = useState<{ done: number; total: number } | null>(null);
  const set = (k: keyof Site) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setS({ ...s, [k]: e.target.value });
  const fmt = new Intl.DateTimeFormat(locale(lang), { day: "numeric", month: "long", year: "numeric" });

  const note = (where: string) =>
    msg?.where === where ? (
      <p className={msg.ok ? "success" : "error"} role={msg.ok ? undefined : "alert"}>
        {msg.text}
      </p>
    ) : null;

  async function run(where: string, body: Record<string, unknown>, ok?: string) {
    setBusy(where);
    setMsg(null);
    try {
      const data = await api(body);
      if (data.redirect) {
        window.location.href = data.redirect;
        return;
      }
      if (data.slug) setS((x) => ({ ...x, slug: data.slug }));
      if (ok) setMsg({ where, ok: true, text: ok });
      router.refresh();
    } catch (err) {
      setMsg({ where, ok: false, text: err instanceof Error ? err.message : "Error" });
    } finally {
      setBusy("");
    }
  }

  async function addPhotos(list: FileList | null) {
    const files = [...(list ?? [])].filter((f) => f.type.startsWith("image/"));
    if (fileRef.current) fileRef.current.value = "";
    if (!files.length) return;
    setMsg(null);
    setUpload({ done: 0, total: files.length });
    try {
      for (let i = 0; i < files.length; i++) {
        const blob = await shrink(files[i]);
        const { url, name } = await api({ action: "photo-url" });
        const put = await fetch(url, { method: "PUT", body: blob, headers: { "Content-Type": "image/jpeg" } });
        if (!put.ok) throw new Error(t("Nie udało się przesłać zdjęcia.", "Could not upload the photo."));
        await api({ action: "photo-done", name });
        setUpload({ done: i + 1, total: files.length });
      }
    } catch (err) {
      setMsg({ where: "photos", ok: false, text: err instanceof Error ? err.message : "Error" });
    } finally {
      setUpload(null);
      router.refresh();
    }
  }

  const services = s.services;
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  // Podgląd na żywo; puste pola wypełniamy przykładową treścią, żeby od razu było widać efekt
  const en = s.lang === "en";
  const demo = {
    title: en ? "Your Studio" : "Twoje Studio",
    tagline: en ? "Wedding photography full of emotion" : "Fotografia ślubna pełna emocji",
    about: en
      ? "I photograph weddings the way they really are – with laughter, tears and all the quiet moments in between. Every story is different, and every gallery is made by hand."
      : "Fotografuję śluby takimi, jakie są naprawdę – ze śmiechem, wzruszeniem i wszystkimi cichymi chwilami pomiędzy. Każda historia jest inna, a każdą galerię tworzę z dbałością o detal.",
    services: en
      ? [
          { name: "Wedding day", price: "from £1,900", desc: "Full-day coverage, 600+ edited photos, online gallery" },
          { name: "Engagement session", price: "£450", desc: "Two hours at a location of your choice, 60 photos" },
          { name: "Elopement", price: "from £950", desc: "An intimate ceremony, up to 4 hours" },
        ]
      : [
          { name: "Reportaż ślubny", price: "od 5 900 zł", desc: "Cały dzień, ponad 600 dopracowanych zdjęć, galeria online" },
          { name: "Sesja narzeczeńska", price: "1 200 zł", desc: "Dwie godziny w wybranym plenerze, 60 zdjęć" },
          { name: "Ślub kameralny", price: "od 2 900 zł", desc: "Ceremonia w małym gronie, do 4 godzin" },
        ],
    photos: [1, 2, 4, 3, 6, 5, 7, 2, 4].map((n) => `/home/foto-${n}.jpg`),
  };
  const usesDemo = !s.title || !s.about || services.length === 0 || photos.length === 0;
  const previewData = {
    title: s.title || demo.title,
    tagline: s.tagline || (s.title ? "" : demo.tagline),
    about: s.about || demo.about,
    city: s.city || (en ? "London & destination" : "Poznań i cała Polska"),
    phone: s.phone,
    instagram: s.instagram,
    facebook: s.facebook,
    services: services.filter((x) => x.name).length ? services.filter((x) => x.name) : demo.services,
    photos: photos.length ? photos.map((p) => p.url) : demo.photos,
    events,
    dark: s.dark,
    lang: s.lang,
    logo,
  };
  const setService = (i: number, k: keyof Service, v: string) => setS({ ...s, services: services.map((x, j) => (j === i ? { ...x, [k]: v } : x)) });

  return (
    <div className="pf-editor">
    <div className="settings">
      <section className="share-bar">
        <div className="share-status">
          <span className={active ? "dot" : "dot dot-off"} aria-hidden="true" />
          <div>
            <p className="share-label">{active ? t("Strona działa", "Your website is live") : t("Strona nieaktywna", "Website not active")}</p>
            <p className="share-note">
              {active && paidUntil
                ? `${t("Opłacona do", "Paid until")} ${fmt.format(new Date(paidUntil))}`
                : t("Uzupełnij treść, dodaj zdjęcia i włącz abonament.", "Fill in the content, add photos and start the subscription.")}
            </p>
          </div>
        </div>
        {s.slug && (
          <div className="share-actions">
            <a href={`${base}${s.slug}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-small">
              {active ? t("Otwórz stronę", "Open website") : t("Podgląd", "Preview")}
            </a>
          </div>
        )}
      </section>

      <form
        className="settings-card"
        onSubmit={(e) => {
          e.preventDefault();
          run("content", { action: "save", ...s }, t("Zapisano.", "Saved."));
        }}
      >
        <h2>{t("Twoja strona", "Your website")}</h2>
        <label htmlFor="pf-slug">{t("Adres strony", "Page address")}</label>
        <div className="slug-row">
          <span>{base}</span>
          <input id="pf-slug" value={s.slug} onChange={set("slug")} placeholder={t("anna-nowak-foto", "anna-smith-photo")} required maxLength={40} />
        </div>
        <div className="sale-fields">
          <div>
            <label htmlFor="pf-title">{t("Nazwa studia", "Studio name")}</label>
            <input id="pf-title" value={s.title} onChange={set("title")} maxLength={80} required />
          </div>
          <div>
            <label htmlFor="pf-city">{t("Miasto / region", "City / region")}</label>
            <input id="pf-city" value={s.city} onChange={set("city")} maxLength={80} placeholder={t("np. Poznań i cała Polska", "e.g. London & destination")} />
          </div>
        </div>
        <label htmlFor="pf-tag">{t("Hasło pod nazwą", "Tagline")}</label>
        <input id="pf-tag" value={s.tagline} onChange={set("tagline")} maxLength={160} placeholder={t("np. Fotografia ślubna pełna emocji", "e.g. Emotional wedding photography")} />
        <label htmlFor="pf-about">{t("O mnie", "About me")}</label>
        <textarea id="pf-about" rows={5} value={s.about} onChange={set("about")} maxLength={3000} />
        <div className="sale-fields">
          <div>
            <label htmlFor="pf-phone">{t("Telefon", "Phone")}</label>
            <input id="pf-phone" value={s.phone} onChange={set("phone")} maxLength={30} />
          </div>
          <div>
            <label htmlFor="pf-ig">Instagram</label>
            <input id="pf-ig" value={s.instagram} onChange={set("instagram")} maxLength={120} placeholder="@annanowak.foto" />
          </div>
          <div>
            <label htmlFor="pf-fb">Facebook</label>
            <input id="pf-fb" value={s.facebook} onChange={set("facebook")} maxLength={160} placeholder="facebook.com/…" />
          </div>
          <div>
            <label htmlFor="pf-lang">{t("Język strony", "Page language")}</label>
            <select id="pf-lang" className="plain-select" value={s.lang} onChange={set("lang")}>
              <option value="pl">Polski</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>

        <p className="field-title">{t("Cennik", "Pricing")}</p>
        <div className="svc-list">
          {services.map((x, i) => (
            <div key={i} className="svc-row">
              <input aria-label={t("Usługa", "Service")} value={x.name} onChange={(e) => setService(i, "name", e.target.value)} placeholder={t("np. Reportaż ślubny", "e.g. Wedding day")} />
              <input aria-label={t("Cena", "Price")} value={x.price} onChange={(e) => setService(i, "price", e.target.value)} placeholder={t("od 4500 zł", "from £1,500")} />
              <input aria-label={t("Opis", "Description")} value={x.desc} onChange={(e) => setService(i, "desc", e.target.value)} placeholder={t("np. 10 godzin, 500 zdjęć, galeria online", "e.g. 10 hours, 500 photos, online gallery")} />
              <button type="button" className="as-link danger" onClick={() => setS({ ...s, services: services.filter((_, j) => j !== i) })}>
                {t("Usuń", "Remove")}
              </button>
            </div>
          ))}
        </div>
        {services.length < 12 && (
          <button type="button" className="as-link" onClick={() => setS({ ...s, services: [...services, { name: "", price: "", desc: "" }] })}>
            + {t("Dodaj pozycję", "Add item")}
          </button>
        )}

        <label className="check" style={{ marginTop: 22 }}>
          <input type="checkbox" checked={s.showBookings} onChange={(e) => setS({ ...s, showBookings: e.target.checked })} />
          {t("Pokaż moje otwarte kalendarze rezerwacji (np. mini sesje)", "Show my open booking calendars (e.g. mini sessions)")}
        </label>
        <label className="check">
          <input type="checkbox" checked={s.dark} onChange={(e) => setS({ ...s, dark: e.target.checked })} />
          {t("Ciemny wygląd strony", "Dark look")}
        </label>
        <label className="check">
          <input type="checkbox" checked={s.consent} onChange={(e) => setS({ ...s, consent: e.target.checked })} />
          {t("Mam zgodę osób widocznych na zdjęciach na ich publikację w portfolio", "I have consent from the people in the photos to publish them in my portfolio")}
        </label>
        {note("content")}
        <button type="submit" className="btn" disabled={busy === "content"}>
          {busy === "content" ? t("Zapisuję…", "Saving…") : t("Zapisz", "Save")}
        </button>
      </form>

      <section className="settings-card">
        <div className="gu-admin-head">
          <h2 style={{ margin: 0 }}>{t("Zdjęcia portfolio", "Portfolio photos")}</h2>
          <button type="button" className="btn btn-small" onClick={() => fileRef.current?.click()} disabled={Boolean(upload)}>
            {upload ? `${upload.done} / ${upload.total}` : t("Dodaj zdjęcia", "Add photos")}
          </button>
        </div>
        <p className="hint-inline">
          {t("Najlepsze ujęcia – do 40. Pierwsze (gwiazdka) jest dużym zdjęciem na górze strony.", "Your best shots – up to 40. The first one (star) is the big photo at the top.")}
        </p>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => addPhotos(e.target.files)} />
        {photos.length > 0 && (
          <div className="gu-grid">
            {photos.map((p, i) => (
              <figure key={p.name} className="gu-tile gu-admin">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" loading="lazy" />
                <button
                  type="button"
                  className="photo-del pf-star"
                  title={t("Ustaw jako zdjęcie główne", "Set as main photo")}
                  aria-label={t("Ustaw jako zdjęcie główne", "Set as main photo")}
                  onClick={() => run("photos", { action: "photo-cover", name: p.name })}
                >
                  {i === 0 ? "★" : "☆"}
                </button>
                <button
                  type="button"
                  className="photo-del"
                  aria-label={t("Usuń zdjęcie", "Delete photo")}
                  onClick={() => window.confirm(t("Usunąć to zdjęcie?", "Delete this photo?")) && run("photos", { action: "photo-delete", name: p.name })}
                >
                  ×
                </button>
              </figure>
            ))}
          </div>
        )}
        {note("photos")}
      </section>

      <section className="settings-card">
        <h2>{active ? t("Przedłuż abonament", "Extend subscription") : t("Włącz stronę", "Turn on your website")}</h2>
        <p>
          {t(
            "Strona z Twoim portfolio, cennikiem, kalendarzem rezerwacji i formularzem kontaktowym – zapytania przychodzą na Twój e-mail.",
            "A website with your portfolio, pricing, booking calendars and contact form – enquiries arrive in your inbox.",
          )}
        </p>
        <div className="period-switch">
          {[1, 12].map((m) => (
            <button key={m} type="button" className={months === m ? "period active" : "period"} onClick={() => setMonths(m)}>
              {m === 1 ? t("1 miesiąc", "1 month") : t("12 miesięcy", "12 months")}
              <small className="period-sub">
                {money(prices[m], lang)}
                {m === 12 && ` · ${t("2 miesiące gratis", "2 months free")}`}
              </small>
            </button>
          ))}
        </div>
        <InvoiceFields value={invoice} onChange={setInvoice} />
        {note("pay")}
        <PayButtons
          price={prices[months]}
          balance={balance}
          busy={busy === "pay"}
          disabled={!s.slug}
          label=""
          onPay={(pay) => run("pay", { action: "pay", months, pay, invoice })}
        />
        {!s.slug && <p className="hint-inline">{t("Najpierw zapisz adres strony.", "Save the page address first.")}</p>}
      </section>
    </div>

    <aside className="pf-preview" aria-label={t("Podgląd strony", "Website preview")}>
      <div className="pf-preview-bar">
        <p>{t("Podgląd na żywo", "Live preview")}</p>
        <div className="period-switch small">
          <button type="button" className={device === "desktop" ? "period active" : "period"} onClick={() => setDevice("desktop")}>
            {t("Komputer", "Desktop")}
          </button>
          <button type="button" className={device === "mobile" ? "period active" : "period"} onClick={() => setDevice("mobile")}>
            {t("Telefon", "Phone")}
          </button>
        </div>
      </div>
      <div className={device === "mobile" ? "pf-frame mobile" : "pf-frame"}>
        <div className="pf-frame-top">
          <i />
          <i />
          <i />
          <span>{`${base.replace(/^https?:\/\//, "")}${s.slug || "twoj-adres"}`}</span>
        </div>
        <div className="pf-viewport">
          <PortfolioView d={previewData} preview contact={<PortfolioContact slug="" lang={s.lang} preview />} />
        </div>
      </div>
      {usesDemo && (
        <p className="pf-demo-note">
          {t("Puste miejsca wypełniliśmy przykładową treścią – zniknie, gdy uzupełnisz swoją.", "Empty fields show sample content – it disappears once you add your own.")}
        </p>
      )}
    </aside>
    </div>
  );
}