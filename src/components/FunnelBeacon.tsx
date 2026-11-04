"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Lejek odwiedzin: każdy etap liczony raz na wizytę (pamięć tylko w tej karcie – bez cookies i localStorage).
// Źródło wizyty brane z pierwszego adresu (gclid / fbclid / utm_source) albo strony, z której ktoś przyszedł.
const seen = new Set<string>();
let source: "google" | "facebook" | "other" | null = null;

function detectSource(): "google" | "facebook" | "other" {
  const p = new URLSearchParams(location.search);
  const s = (p.get("utm_source") ?? "").toLowerCase();
  if (p.get("gclid") || p.get("gbraid") || p.get("wbraid") || (s === "google" && /cpc|paid|ads/.test(p.get("utm_medium") ?? ""))) return "google";
  if (p.get("fbclid") || /facebook|instagram|fb|ig|meta/.test(s)) return "facebook";
  if (/facebook\.|instagram\.|fb\.|messenger\./.test(document.referrer)) return "facebook";
  return "other";
}

function send(stage: string) {
  if (seen.has(stage)) return;
  seen.add(stage);
  const body = JSON.stringify({ stage, src: source });
  try {
    if (navigator.sendBeacon?.("/api/funnel", new Blob([body], { type: "application/json" }))) return;
  } catch {}
  fetch("/api/funnel", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => undefined);
}

export default function FunnelBeacon() {
  const path = usePathname();
  useEffect(() => {
    source ??= detectSource();
    send("visit");
    if (/^\/(cennik|funkcje)(\/|$)/.test(path)) send("pricing");
    if (/^\/rejestracja(\/|$)/.test(path)) send("signup");
  }, [path]);
  return null;
}
