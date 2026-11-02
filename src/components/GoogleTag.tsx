"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { useLang } from "@/components/LangProvider";
import { ADS_ID, ADS_SIGNUP_LABEL, CONSENT_KEY, CLARITY_ID } from "@/lib/ads";

// gtag wymaga obiektu arguments, nie tablicy
function gtag(..._args: unknown[]) {
  const w = window as unknown as { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer || [];
  // eslint-disable-next-line prefer-rest-params
  w.dataLayer.push(arguments);
}

const readConsent = () => {
  try {
    return localStorage.getItem(CONSENT_KEY);
  } catch {
    return null;
  }
};

const granted = { ad_storage: "granted", ad_user_data: "granted", ad_personalization: "granted", analytics_storage: "granted" };

// Tag Google z trybem zgody (domyślnie wszystko odrzucone) + baner cookie
// clarity – Microsoft Clarity (mapy kliknięć, nagrania) – ładowany dopiero po zgodzie, tylko na stronach informacyjnych
export default function GoogleTag({ conversion = false, clarity = false }: { conversion?: boolean; clarity?: boolean }) {
  const lang = useLang();
  const t = (pl: string, en: string) => (lang === "en" ? en : pl);
  const [ask, setAsk] = useState(false);
  const [consented, setConsented] = useState(false);
  const sent = useRef(false);

  useEffect(() => {
    const c = readConsent();
    if (c === "granted") {
      gtag("consent", "update", granted);
      setConsented(true);
    }
    if (!c) setAsk(true);
    const reopen = () => setAsk(true);
    window.addEventListener("lenslie-cookies", reopen);
    return () => window.removeEventListener("lenslie-cookies", reopen);
  }, []);

  useEffect(() => {
    if (!conversion || !ADS_SIGNUP_LABEL || sent.current) return;
    sent.current = true;
    gtag("event", "conversion", { send_to: `${ADS_ID}/${ADS_SIGNUP_LABEL}` });
  }, [conversion]);

  function decide(ok: boolean) {
    try {
      localStorage.setItem(CONSENT_KEY, ok ? "granted" : "denied");
    } catch {}
    gtag(
      "consent",
      "update",
      ok ? granted : { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "denied" },
    );
    setAsk(false);
    setConsented(ok);
  }

  return (
    <>
      <Script id="gtag-consent" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});
try{if(localStorage.getItem('${CONSENT_KEY}')==='granted')gtag('consent','update',{ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted',analytics_storage:'granted'});}catch(e){}
gtag('js',new Date());gtag('config','${ADS_ID}');`}
      </Script>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${ADS_ID}`} strategy="afterInteractive" />
      {clarity && consented && (
        <Script id="ms-clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${CLARITY_ID}");
window.clarity("consentv2",{ad_Storage:"granted",analytics_Storage:"granted"});`}
        </Script>
      )}
      {ask && (
        <div className="cookie-bar" role="dialog" aria-label={t("Pliki cookie", "Cookies")}>
          <p>
            {t(
              "Ta strona używa plików cookie.",
              "This website uses cookies.",
            )}{" "}
            <a href="/polityka-prywatnosci">{t("Więcej", "More")}</a>
          </p>
          <div>
            <button type="button" className="btn btn-ghost" onClick={() => decide(false)}>
              {t("Tylko niezbędne", "Necessary only")}
            </button>
            <button type="button" className="btn btn-dark" onClick={() => decide(true)}>
              {t("Akceptuję", "Accept")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function CookieSettings({ label }: { label: string }) {
  return (
    <button type="button" className="as-link footer-link" onClick={() => window.dispatchEvent(new Event("lenslie-cookies"))}>
      {label}
    </button>
  );
}
