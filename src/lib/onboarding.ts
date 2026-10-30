import { randomBytes } from "crypto";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { r2, BUCKET } from "@/lib/r2";
import { sendEmail, emailLayout, siteUrl } from "@/lib/email";
import type { SiteLang } from "@/lib/lang";
import { COMPANY } from "@/lib/company";

// Maile powitalne dla nowych fotografów: od razu, po 2 dniach (jeśli nic nie opublikował) i po tygodniu.
// Stan w R2: onboarding/<uid>.json – co już wysłano i czy fotograf wyłączył wskazówki.
export type OnboardingStep = "welcome" | "nudge" | "tips";
export type OnboardingState = { token: string; sent: Partial<Record<OnboardingStep, string>>; off?: string };

export const NUDGE_AFTER_DAYS = 2;
export const TIPS_AFTER_DAYS = 7;

const key = (uid: string) => `onboarding/${uid}.json`;

export async function getOnboarding(uid: string): Promise<OnboardingState> {
  try {
    const res = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key(uid) }));
    const s = JSON.parse((await res.Body?.transformToString()) ?? "null") as OnboardingState | null;
    if (s?.token) return { ...s, sent: s.sent ?? {} };
  } catch {}
  return { token: randomBytes(12).toString("hex"), sent: {} };
}

export async function saveOnboarding(uid: string, s: OnboardingState) {
  await r2.send(new PutObjectCommand({ Bucket: BUCKET, Key: key(uid), Body: JSON.stringify(s), ContentType: "application/json" }));
}

function mail(step: OnboardingStep, lang: SiteLang) {
  const en = lang === "en";
  const panel = `${siteUrl()}/panel`;
  if (step === "welcome") {
    return {
      subject: en ? "Welcome to Lenslie – your first gallery in 3 minutes" : "Witaj w Lenslie – pierwsza galeria w 3 minuty",
      title: en ? "Welcome to Lenslie" : "Witaj w Lenslie",
      lines: en
        ? [
            "Thank you for joining! We've added PLN 20 to your balance – enough to publish your first gallery.",
            "1. Click “New gallery” and give it a name, e.g. the couple's names.",
            "2. Drag your photos in – full resolution, no compression.",
            "3. Click “Publish”, choose how long your client should have access and pay from your balance.",
            "4. Send your client the link or QR code – they can pick favourites and download everything.",
            "Working in Lightroom? Install our free plug-in and publish galleries straight from your catalogue.",
          ]
        : [
            "Dziękujemy, że jesteś z nami! Na Twoje saldo trafiło 20 zł – wystarczy na publikację pierwszej galerii.",
            "1. Kliknij „Nowa galeria” i nadaj jej nazwę, np. imiona pary.",
            "2. Przeciągnij zdjęcia – w pełnej rozdzielczości, bez kompresji.",
            "3. Kliknij „Opublikuj”, wybierz, jak długo klient ma mieć dostęp, i zapłać z salda.",
            "4. Wyślij klientowi link albo kod QR – wybierze ulubione i pobierze wszystko jednym kliknięciem.",
            "Pracujesz w Lightroomie? Zainstaluj naszą darmową wtyczkę i publikuj galerie prosto z katalogu.",
          ],
      button: { label: en ? "Create your first gallery" : "Utwórz pierwszą galerię", url: panel },
    };
  }
  if (step === "nudge") {
    return {
      subject: en ? "Your PLN 20 is waiting – publish your first gallery" : "Twoje 20 zł czeka – opublikuj pierwszą galerię",
      title: en ? "Your first gallery is one step away" : "Pierwsza galeria jest o krok",
      lines: en
        ? [
            "You still have PLN 20 on your Lenslie balance – enough for your first gallery.",
            "Pick any recent session, drag in the photos and publish. Your client gets an elegant gallery with favourites, downloads and a slideshow – on phone and computer.",
            "Questions? Just reply to this e-mail – we're happy to help.",
          ]
        : [
            "Na Twoim saldzie w Lenslie nadal czeka 20 zł – wystarczy na pierwszą galerię.",
            "Wybierz dowolną ostatnią sesję, przeciągnij zdjęcia i opublikuj. Klient dostanie elegancką galerię z ulubionymi, pobieraniem i pokazem slajdów – na telefonie i komputerze.",
            "Masz pytania? Odpisz na tego maila – chętnie pomożemy.",
          ],
      button: { label: en ? "Publish a gallery" : "Opublikuj galerię", url: panel },
    };
  }
  return {
    subject: en ? "3 things that save photographers hours in Lenslie" : "3 rzeczy, które oszczędzają fotografom godziny w Lenslie",
    title: en ? "Get more out of Lenslie" : "Wyciśnij więcej z Lenslie",
    lines: en
      ? [
          "Lightroom plug-in – publish and update galleries straight from Lightroom, no exporting and uploading.",
          "Album designer – your client hearts their favourite photos and the album lays itself out, ready for print.",
          "Pro plans – if you deliver many sessions, one monthly fee covers all galleries, videos and add-ons (from PLN 59 a month).",
        ]
      : [
          "Wtyczka do Lightrooma – publikujesz i aktualizujesz galerie prosto z Lightrooma, bez eksportu i wgrywania.",
          "Projektor albumów – klient zaznacza ulubione zdjęcia, a album układa się sam i jest gotowy do druku.",
          "Pakiety Pro – jeśli oddajesz dużo sesji, jedna miesięczna opłata obejmuje wszystkie galerie, filmy i dodatki (od 59 zł miesięcznie).",
        ],
    button: { label: en ? "See what's included" : "Zobacz, co zyskasz", url: `${siteUrl()}/cennik#pro` },
  };
}

// Wysyła krok powitalny (jeśli jeszcze nie wysłany i fotograf nie wyłączył wskazówek). Zwraca true po wysłaniu.
export async function sendOnboarding(uid: string, email: string, step: OnboardingStep, lang: SiteLang): Promise<boolean> {
  const s = await getOnboarding(uid);
  if (s.off || s.sent[step]) return false;
  const m = mail(step, lang);
  const off = `${siteUrl()}/api/onboarding?u=${encodeURIComponent(uid)}&t=${s.token}`;
  const html = emailLayout(m.title, m.lines, m.button, lang).replace(
    "</div></body></html>",
    `<p style="font-size:12px;color:#958c85;margin:8px 0 0">${
      lang === "en" ? "Tips for new Lenslie users." : "Wskazówki dla nowych użytkowników Lenslie."
    } <a href="${off}" style="color:#958c85">${lang === "en" ? "Don't send me tips" : "Nie wysyłaj mi wskazówek"}</a></p></div></body></html>`,
  );
  const ok = await sendEmail({ to: email, subject: m.subject, html, replyTo: COMPANY.email }).catch(() => false);
  if (ok) await saveOnboarding(uid, { ...s, sent: { ...s.sent, [step]: new Date().toISOString() } });
  return Boolean(ok);
}
