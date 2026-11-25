"use client";

import { useState } from "react";

// Płatności kartą za zdjęcia w galeriach angielskich: podłączenie konta Stripe fotografa
export default function StripeConnectCard({
  status,
  country,
  countries,
  fee,
}: {
  status: "none" | "pending" | "ready";
  country: string;
  countries: [string, string][];
  fee: number;
}) {
  const [c, setC] = useState(countries.some(([k]) => k === country) ? country : "GB");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function go(action: "start" | "dashboard") {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/stripe-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, country: c }),
      });
      const data = await res.json();
      if (!res.ok || !data.redirect) throw new Error(data.error ?? "Something went wrong.");
      window.location.href = data.redirect;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <div className="settings-card" id="karta">
      <h2>Card payments in your galleries</h2>
      <p>
        Let clients pay for extra photos by card, Apple Pay or Google Pay right in your English galleries. The photos unlock automatically after
        payment and the money goes straight to your own Stripe account, paid out to your bank. Lenslie keeps {fee}% of each sale to cover card
        fees.
      </p>
      {status === "ready" ? (
        <>
          <p className="success">✓ Your Stripe account is connected – card payments are on.</p>
          <button type="button" className="btn" disabled={busy} onClick={() => go("dashboard")}>
            {busy ? "Opening…" : "Open my Stripe dashboard"}
          </button>
        </>
      ) : (
        <>
          {status === "pending" && (
            <p className="warn-inline">Your Stripe setup isn’t finished yet. Continue where you left off – it takes a few minutes.</p>
          )}
          {status === "none" && (
            <>
              <label htmlFor="sc-country">Country of your business</label>
              <select id="sc-country" value={c} onChange={(e) => setC(e.target.value)}>
                {countries.map(([k, n]) => (
                  <option key={k} value={k}>
                    {n}
                  </option>
                ))}
              </select>
            </>
          )}
          <button type="button" className="btn btn-dark" disabled={busy} onClick={() => go("start")}>
            {busy ? "Redirecting to Stripe…" : status === "pending" ? "Continue Stripe setup" : "Connect Stripe"}
          </button>
        </>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
