import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import { isValidGalleryId } from "@/lib/r2";
import Uploader from "./Uploader";

export const dynamic = "force-dynamic";

export default async function NowaGaleria({
  searchParams,
}: {
  searchParams: Promise<{ galeria?: string }>;
}) {
  const { galeria } = await searchParams;

  let existing: { id: string; title: string } | null = null;
  if (galeria && isValidGalleryId(galeria)) {
    const { supabase } = await getUser();
    const { data } = await supabase.from("galleries").select("id, title").eq("id", galeria).maybeSingle();
    existing = (data as { id: string; title: string } | null) ?? null;
  }

  return (
    <main className="app-main app-narrow">
      <Link href="/panel" className="link-quiet back-link">← Wróć do galerii</Link>
      <h1>{existing ? existing.title : "Nowa galeria"}</h1>
      <p className="lead">
        {existing
          ? "Dodaj kolejne zdjęcia do tej galerii. Możesz też ustawić nowe hasło dla klienta."
          : "Wpisz nazwę sesji i wybierz zdjęcia. Każde zdjęcie zapisze się w pełnej jakości do pobrania oraz w lżejszej wersji do oglądania."}
      </p>
      <Uploader initialName={existing?.title ?? ""} galleryId={existing?.id} />
    </main>
  );
}
