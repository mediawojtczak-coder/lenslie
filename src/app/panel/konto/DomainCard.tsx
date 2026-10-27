"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Rec = { host: string; paidUntil: string } | null;
const dateFmt = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric" });

async function call(body: unknown) {
  const res = await fetch("/api/domain", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error(data.error ?? "Coś poszło nie tak.") as Error & { code?: string };
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
      setError(err instanceof Error ? err.message : "Coś poszło nie tak.");
      setFunds((err as { code?: string }).code === "FUNDS");
    } finally {
      setBusy(false);
    }
  }

  if (!enabled) return null;

  return (
    <div className="settings-card" id="domena">
      <h2>Własna domena</h2>
      <p>
        Galerie pod Twoim adresem, np. <strong>galerie.twojastrona.pl/anna-i-marek</strong> zamiast lenslie.com. Koszt:{" "}
        <strong>{price} zł za rok</strong>, płatne z salda.
      </p>

      {rec && (
        <div className="domain-box">
          <p className="domain-host">{rec.host}</p>
          <p className="hint-inline">
            {active ? `Opłacona do ${dateFmt.format(new Date(rec.paidUntil))}` : "Wygasła – przedłuż, aby galerie znów działały pod tym adresem."}
          </p>
          {active && dns && (
            dns.configured ? (
              <p className="success-box">Domena działa. Linki do galerii w „Udostępnij” mają już Twój adres.</p>
            ) : (
              <div className="dns-help">
                <p>
                  <strong>Ostatni krok:</strong> w panelu firmy, w której masz domenę (np. home.pl, OVH, nazwa.pl), dodaj rekord DNS:
                </p>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Typ</th>
                      <th>Nazwa</th>
                      <th>Wartość</th>
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
                <p className="hint-inline">Zmiana działa zwykle po kilku minutach, czasem do kilku godzin. Certyfikat HTTPS ustawiamy automatycznie.</p>
                <button type="button" className="btn btn-ghost btn-small" onClick={check} disabled={busy}>
                  Sprawdź ponownie
                </button>
              </div>
            )
          )}
          <div className="domain-actions">
            <button type="button" className="btn btn-ghost btn-small" disabled={busy} onClick={() => run({ action: "renew" })}>
              Przedłuż o rok ({price} zł)
            </button>
            <button
              type="button"
              className="as-link danger"
              disabled={busy}
              onClick={() => window.confirm(`Odłączyć ${rec.host}? Galerie będą znów dostępne tylko pod lenslie.com.`) && run({ action: "remove" })}
            >
              Odłącz domenę
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
        <label htmlFor="d-host">{rec && active ? "Zmień adres (bez dopłaty)" : "Twoja subdomena"}</label>
        <input id="d-host" value={host} onChange={(e) => setHost(e.target.value)} placeholder="np. galerie.twojastrona.pl" />
        {error && (
          <p className="error" role="alert">
            {error} {funds && <a href="#saldo">Doładuj konto ›</a>}
          </p>
        )}
        <button type="submit" className="btn" disabled={busy || !host.trim()}>
          {busy ? "Podłączam…" : rec && active ? "Zmień adres" : `Kup i podłącz za ${price} zł`}
        </button>
        {!(rec && active) && (
          <p className="test-note left">Stan salda: {(balance / 100).toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł</p>
        )}
      </form>
    </div>
  );
}
