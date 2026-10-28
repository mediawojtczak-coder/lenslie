"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTr } from "@/components/LangProvider";
import { applyWatermarkTo } from "@/lib/watermark-client";

// Zdjęcia bez znaku wodnego (np. z Lightrooma) – klient ich nie widzi, dopóki panel nie nałoży znaku. Robi to od razu po otwarciu galerii.
export default function WmAutoFix({ id, names, text }: { id: string; names: string[]; text: string }) {
  const t = useTr();
  const router = useRouter();
  const [done, setDone] = useState(0);
  const [state, setState] = useState<"run" | "ok" | "error">("run");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    applyWatermarkTo(id, names, text, setDone)
      .then(() => {
        setState("ok");
        router.refresh();
      })
      .catch(() => setState("error"));
  }, [id, names, text, router]);

  if (state === "ok") return <p className="success-box wm-auto">{t("Znak wodny nałożony – nowe zdjęcia są już widoczne dla klienta.", "Watermark applied – the new photos are now visible to your client.")}</p>;
  return (
    <p className={state === "error" ? "warn-inline wm-auto" : "hint-inline wm-auto"}>
      {state === "error"
        ? t("Nie udało się nałożyć znaku wodnego. Odśwież stronę, aby spróbować ponownie.", "Could not apply the watermark. Refresh the page to try again.")
        : `${t("Nakładam znak wodny na nowe zdjęcia", "Applying the watermark to new photos")}: ${done} / ${names.length}. ${t("Nie zamykaj tej strony – do tego czasu klient ich nie widzi.", "Keep this page open – until then your client can't see them.")}`}
    </p>
  );
}
