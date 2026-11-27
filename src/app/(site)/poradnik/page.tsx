import Link from "@/components/SiteLink";
import { langAlternates } from "@/lib/en-paths";
import type { Metadata } from "next";
import { getLang } from "@/lib/lang-server";
import { tr } from "@/lib/lang";
import { GUIDES } from "@/lib/guides";

export async function generateMetadata(): Promise<Metadata> {
  const en = (await getLang()) === "en";
  return {
    title: en ? "Guide for photographers – delivering photos to clients | Lenslie" : "Poradnik dla fotografów – jak oddawać zdjęcia klientom | Lenslie",
    description: en
      ? "Practical articles for photographers: how to deliver photos to clients, run online galleries, let clients pick photos and design albums."
      : "Praktyczne artykuły dla fotografów: jak przekazać zdjęcia klientowi, jak prowadzić galerie online, wybór zdjęć przez klienta i albumy.",
    alternates: langAlternates("/poradnik", (en ? "en" : "pl")),
  };
}

export default async function Poradnik() {
  const lang = await getLang();
  const t = (pl: string, en: string) => tr(lang, pl, en);
  const i = lang === "en" ? 1 : 0;

  return (
    <div className="legal guide-list">
      <h1>{t("Poradnik dla fotografów", "A guide for photographers")}</h1>
      <p className="legal-meta">
        {t(
          "Jak oddawać zdjęcia klientom, prowadzić galerie online i oszczędzać czas po sesji – krótko i konkretnie.",
          "How to deliver photos to clients, run online galleries and save time after a shoot – short and practical.",
        )}
      </p>
      <ul className="guide-cards">
        {GUIDES.map((g) => (
          <li key={g.slug}>
            <Link href={`/poradnik/${g.slug}`}>
              <h2>{g.title[i]}</h2>
              <p>{g.excerpt[i]}</p>
              <span className="guide-more">{t("Czytaj →", "Read →")}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p>
        {t("Szukasz porównania z Pixieset? ", "Looking for a Pixieset comparison? ")}
        <Link href="/alternatywa-pixieset">{t("Alternatywa dla Pixieset po polsku", "A Pixieset alternative in Polish")}</Link>
        {" · "}
        <Link href="/cennik">{t("Cennik Lenslie", "Lenslie pricing")}</Link>
      </p>
    </div>
  );
}
