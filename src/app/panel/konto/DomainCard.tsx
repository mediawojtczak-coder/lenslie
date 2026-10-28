"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/components/LangProvider";
import { tr, money, locale } from "@/lib/lang";

type Rec = { host: string; paidUntil: string } | null;

async function call(body: unknown) {
  const res = await fetch("/api/domain", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error(data.error ?? "Error") as Error & { code?: string };
    e.code = data.code;
    throw e;
  }
  return data;
}

// Własna domena fotografa: zakup z salda, instrukcja DNS, stan podłączenia
export default function DomainCard({
  rec,
  active,
  price,
  balance,
  enabled,
}: {
  rec: Rec;
  active: boolean;
  price: number;
  balance: number;
  enabled: boolean;
}) {
  const router = useRouter();
  const lang = useLang();
  const t = (pl: string, en: string) => tr(lang, pl, en);
  const z = (n: number) => money(n, lang);
  const dateFmt = new Intl.DateTimeFormat(locale(lang), { day: "numeric", month: "long", year: "numeric" });
  const [host, setHost] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [funds, setFunds] = useState(false);
  const [dns, setDns] = useState<{ configured: boolean; cname: string } | null>(null);

  const label = rec?.host.split(".")[0] ?? "galerie";

  async function check() {
    try {
      setDns(await call({ action: "status" }));
    } catch {
      /* pomijamy */
    }
  }
  useEffect(() => {
    if (rec && active) check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec?.host]);

  async function run(body: unknown) {
    setBusy(true);
    setError("");
    setFunds(false);
    try {
      const data = await call(body);
      if (data.cname) setDns(data);
      setHost("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Coś poszło nie tak.", "Something went wrong."));
      setFunds((err as { code?: string }).code === "FUNDS");
    } finally {
      setBusy(false);
    }
  }

  if (!enabled) return null;

  return (
    <div className="settings-card" id="domena">
      <h2>{t("Własna domena", "Custom domain")}</h2>
      <p>
        {t("Galerie pod Twoim adresem, np.", "Galleries at your own address, e.g.")}{" "}
        <strong>{t("galerie.twojastrona.pl/anna-i-marek", "photos.yourwebsite.com/anna-and-mark")}</strong> {t("zamiast lenslie.com. Koszt:", "instead of lenslie.com. Cost:")}{" "}
        <strong>{z(price)} {t("za rok", "per year")}</strong>{t(", płatne z salda.", ", paid from your balance.")}
      </p>

      {rec && (
        <div className="domain-box">
          <p className="domain-host">{rec.host}</p>
          <p className="hint-inline">
            {active ? `${t("Opłacona do", "Paid until")} ${dateFmt.format(new Date(rec.paidUntil))}` : t("Wygasła – przedłuż, aby galerie znów działały pod tym adresem.", "Expired – renew it so galleries work at this address again.")}
          </p>
          {active && dns && (
            dns.configured ? (
              <p className="success-box">{t("Domena działa. Linki do galerii w „Udostępnij” mają już Twój adres.", "The domain works. Gallery links in “Share” already use your address.")}</p>
            ) : (
              <div className="dns-help">
                <p>
                  <strong>{t("Ostatni krok:", "Last step:")}</strong> {t("w panelu firmy, w której masz domenę (np. home.pl, OVH, nazwa.pl), dodaj rekord DNS:", "in your domain provider's panel (e.g. GoDaddy, Namecheap, OVH), add this DNS record:")}
                </p>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t("Typ", "Type")}</th>
                      <th>{t("Nazwa", "Name")}</th>
                      <th>{t("Wartość", "Value")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>CNAME</td>
                      <td>{label}</td>
                      <td>{dns.cname}</td>
                    </tr>
                  </tbody>
                </table>
                <p className="hint-inline">
                  {t(
                    `Nie kupujesz nowej domeny – rekord dodajesz w ustawieniach DNS domeny, którą już masz (${rec.host.split(".").slice(1).join(".")}). W home.pl: Moje konto → Domeny → wybierz domenę → Strefa DNS / Rekordy DNS → Dodaj rekord.`,
                    `You don't buy a new domain – add the record in the DNS settings of the domain you already own (${rec.host.split(".").slice(1).join(".")}).`,
                  )}
                </p>
                <p className="hint-inline">{t("Zmiana działa zwykle po kilku minutach, czasem do kilku godzin. Certyfikat HTTPS ustawiamy automatycznie.", "The change usually works within minutes, sometimes up to a few hours. We set up the HTTPS certificate automatically.")}</p>
                <button type="button" className="btn btn-ghost btn-small" onClick={check} disabled={busy}>
                  {t("Sprawdź ponownie", "Check again")}
                </button>
              </div>
            )
          )}
          <div className="domain-actions">
            <button type="button" className="btn btn-ghost btn-small" disabled={busy} onClick={() => run({ action: "renew" })}>
              {t("Przedłuż o rok", "Renew for a year")} ({z(price)})
            </button>
            <button
              type="button"
              className="as-link danger"
              disabled={busy}
              onClick={() => window.confirm(t(`Odłączyć ${rec.host}? Galerie będą znów dostępne tylko pod lenslie.com.`, `Disconnect ${rec.host}? Galleries will again be available only at lenslie.com.`)) && run({ action: "remove" })}
            >
              {t("Odłącz domenę", "Disconnect domain")}
            </button>
          </div>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          run({ action: rec && active ? "change" : "buy", host });
        }}
      >
        <label htmlFor="d-host">{rec && active ? t("Zmień adres (bez dopłaty)", "Change address (no extra charge)") : t("Twoja subdomena", "Your subdomain")}</label>
        <input id="d-host" value={host} onChange={(e) => setHost(e.target.value)} placeholder={t("np. galerie.twojastrona.pl", "e.g. photos.yourwebsite.com")} />
        {error && (
          <p className="error" role="alert">
            {error} {funds && <a href="#saldo">{t("Doładuj konto ›", "Top up ›")}</a>}
          </p>
        )}
        <button type="submit" className="btn" disabled={busy || !host.trim()}>
          {busy ? t("Podłączam…", "Connecting…") : rec && active ? t("Zmień adres", "Change address") : `${t("Kup i podłącz za", "Buy and connect for")} ${z(price)}`}
        </button>
        {!(rec && active) && (
          <p className="test-note left">{t("Stan salda", "Balance")}: {money(balance / 100, lang, true)}</p>
        )}
      </form>
    </div>
  );
}
