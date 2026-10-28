import Link from "next/link";
import SideLogout from "@/components/SideLogout";
import { getUser } from "@/lib/supabase/server";
import { getLang } from "@/lib/lang-server";
import { tr, locale } from "@/lib/lang";
import { notFound } from "next/navigation";
import { listTokens, lrAllowed, LR_PLUGIN_VERSION } from "@/lib/lr";
import RevokeButton from "./RevokeButton";

export const dynamic = "force-dynamic";

// Wtyczka Lightroom Classic: pobranie, instalacja krok po kroku i połączone komputery
export default async function LightroomPage() {
  const { user } = await getUser();
  if (!lrAllowed(user?.email)) notFound();
  const lang = await getLang();
  const t = (pl: string, en: string) => tr(lang, pl, en);
  const tokens = user ? await listTokens(user.id).catch(() => []) : [];
  const fmt = new Intl.DateTimeFormat(locale(lang), { day: "numeric", month: "long", year: "numeric" });

  const steps = [
    {
      title: t("Pobierz wtyczkę", "Download the plug-in"),
      text: t(
        "Rozpakuj plik i przenieś folder „lenslie.lrplugin” w stałe miejsce, np. do Dokumentów. Lightroom korzysta z niego z tego miejsca.",
        "Unzip it and move the “lenslie.lrplugin” folder to a permanent place, e.g. Documents. Lightroom uses it from there.",
      ),
    },
    {
      title: t("Dodaj ją w Lightroomie", "Add it in Lightroom"),
      text: t(
        "Lightroom Classic → Plik → Menedżer zewnętrznych modułów (Plug-in Manager) → Dodaj → wskaż folder „lenslie.lrplugin”.",
        "Lightroom Classic → File → Plug-in Manager → Add → choose the “lenslie.lrplugin” folder.",
      ),
    },
    {
      title: t("Zaloguj się", "Sign in"),
      text: t(
        "W module Biblioteka, w lewej kolumnie „Usługi publikowania”, kliknij „Skonfiguruj” przy Lenslie. Wpisz e-mail i hasło do Lenslie, kliknij „Zaloguj”, potem „Zapisz”.",
        "In the Library module, in the Publish Services panel on the left, click “Set Up” next to Lenslie. Enter your Lenslie e-mail and password, click “Sign in”, then “Save”.",
      ),
    },
    {
      title: t("Publikuj galerie", "Publish galleries"),
      text: t(
        "Prawy przycisk na „Lenslie” → Utwórz kolekcję. Nazwa kolekcji to nazwa galerii. Przeciągnij zdjęcia i kliknij „Publikuj” – trafią do galerii w pełnej jakości razem z podglądami.",
        "Right-click “Lenslie” → Create Collection. The collection name becomes the gallery name. Drag photos in and click “Publish” – they arrive in full quality together with previews.",
      ),
    },
  ];

  return (
    <div className="app-body">
      <aside className="app-side">
        <Link href="/panel" className="link-quiet back-link">← {t("Galerie", "Galleries")}</Link>
        <nav aria-label="Lightroom">
          <span className="side-link active">{t("Wtyczka Lightroom", "Lightroom plug-in")}</span>
        </nav>
        <SideLogout />
      </aside>
      <main className="app-main">
        <div className="lr">
          <section className="lr-hero">
            <div>
              <p className="fs-kicker">Lightroom Classic</p>
              <h1>{t("Wysyłaj galerie prosto z Lightrooma", "Send galleries straight from Lightroom")}</h1>
              <p className="lr-lead">
                {t(
                  "Bez eksportu na dysk i wgrywania przez przeglądarkę. Kolekcja w Lightroomie to galeria w Lenslie – poprawiasz zdjęcie, klikasz „Publikuj” i klient widzi nową wersję.",
                  "No exporting to disk and uploading in the browser. A Lightroom collection is a Lenslie gallery – edit a photo, click “Publish” and your client sees the new version.",
                )}
              </p>
              <div className="fs-ctas">
                <a href="/lenslie-lightroom.zip" download className="btn btn-dark">
                  {t("Pobierz wtyczkę", "Download the plug-in")}
                </a>
                <span className="lr-ver">
                  {t("Wersja", "Version")} {LR_PLUGIN_VERSION} · Windows & macOS
                </span>
              </div>
            </div>
            <div className="lr-mock" aria-hidden="true">
              <div className="lr-mock-panel">
                <p className="lr-mock-h">{t("Usługi publikowania", "Publish Services")}</p>
                <p className="lr-mock-svc">
                  <span className="lr-mock-ico">L</span> Lenslie
                </p>
                <p className="lr-mock-col on">
                  {t("Ślub Anny i Marka", "Anna & Mark wedding")} <em>412</em>
                </p>
                <p className="lr-mock-col">
                  {t("Sesja rodzinna Nowak", "Nowak family session")} <em>86</em>
                </p>
                <p className="lr-mock-col">
                  {t("Chrzest Zosi", "Zosia's christening")} <em>154</em>
                </p>
              </div>
              <span className="lr-mock-arrow">→</span>
              <div className="lr-mock-gallery">
                {[1, 4, 2, 7, 3, 6].map((n, i) => (
                  <span key={i} style={{ backgroundImage: `url(/home/foto-${n}.jpg)` }} />
                ))}
              </div>
            </div>
          </section>

          <section className="lr-steps">
            <h2>{t("Instalacja w 4 krokach", "Set up in 4 steps")}</h2>
            <ol>
              {steps.map((s, i) => (
                <li key={i}>
                  <span>{i + 1}</span>
                  <div>
                    <h3>{s.title}</h3>
                    <p>{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="lr-grid">
            <div className="settings-card">
              <h2>{t("Jak to działa", "How it works")}</h2>
              <ul className="fs-list">
                <li>{t("Nowa kolekcja tworzy galerię w Lenslie (wersję roboczą). Pakiet wybierasz i publikujesz dla klienta w panelu.", "A new collection creates a Lenslie gallery (as a draft). Choose a plan and publish it for your client in the dashboard.")}</li>
                <li>{t("Oryginał w jakości z okna eksportu i lżejsza wersja do oglądania (2048 px) – jak przy wgrywaniu w panelu.", "The original at your export quality plus a lighter viewing version (2048 px) – just like uploading in the dashboard.")}</li>
                <li>{t("Poprawione zdjęcia trafiają do „Zmodyfikowanych” – jedno kliknięcie podmienia je w galerii.", "Edited photos move to “Modified Photos to Re-Publish” – one click replaces them in the gallery.")}</li>
                <li>{t("Usunięcie zdjęcia z kolekcji usuwa je z galerii. Zmiana nazwy kolekcji zmienia nazwę galerii.", "Removing a photo from the collection removes it from the gallery. Renaming the collection renames the gallery.")}</li>
                <li>{t("Ze znakiem wodnym: po publikacji otworzy się panel galerii i nałoży znak na nowe zdjęcia. Do tego czasu klient ich nie widzi.", "With a watermark: after publishing, the gallery dashboard opens and applies it to the new photos. Until then your client can't see them.")}</li>
              </ul>
              <p className="hint-inline">{t("Działa w Lightroom Classic 6 i nowszych. Lightroom w chmurze (bez „Classic”) nie obsługuje wtyczek.", "Works in Lightroom Classic 6 and later. Cloud-based Lightroom (without “Classic”) doesn't support plug-ins.")}</p>
            </div>

            <div className="settings-card">
              <h2>{t("Połączone komputery", "Connected computers")}</h2>
              {tokens.length === 0 ? (
                <p className="hint-inline">{t("Wtyczka nie jest jeszcze zalogowana na żadnym komputerze.", "The plug-in isn't signed in on any computer yet.")}</p>
              ) : (
                <>
                  <ul className="lr-devices">
                    {tokens.map((tk) => (
                      <li key={tk.hash}>
                        <span>{tk.device ?? "Lightroom"}</span>
                        <small>
                          {t("zalogowano", "signed in")} {fmt.format(new Date(tk.createdAt))}
                        </small>
                      </li>
                    ))}
                  </ul>
                  <RevokeButton />
                </>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
