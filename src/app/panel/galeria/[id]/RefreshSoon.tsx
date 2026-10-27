"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Odświeża stronę co kilka sekund (przez minutę), aż przyjdzie potwierdzenie płatności
export default function RefreshSoon() {
  const router = useRouter();
  useEffect(() => {
    let n = 0;
    const t = setInterval(() => {
      if (++n > 15) clearInterval(t);
      else router.refresh();
    }, 4000);
    return () => clearInterval(t);
  }, [router]);
  return null;
}
