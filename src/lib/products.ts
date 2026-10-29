import type { ProductAction } from "@/lib/p24";
import { addOwnedTheme } from "@/lib/themes";
import { getMeta, saveMeta } from "@/lib/galleries";
import { extendPortfolio } from "@/lib/portfolio";
import { extendAlbumSub } from "@/lib/albums";
import { printPaid } from "@/lib/print-fulfil";
import { applyPro } from "@/lib/pro";

// Wykonanie opłaconego dodatku (po płatności z salda albo po potwierdzeniu z Przelewy24)
export async function fulfillProduct(a: ProductAction) {
  if (a.product === "theme") {
    await addOwnedTheme(a.uid, a.theme);
    if (a.galleryId) {
      const meta = await getMeta(a.galleryId);
      if (meta) {
        meta.theme = a.theme;
        await saveMeta(a.galleryId, meta);
      }
    }
  } else if (a.product === "portfolio") {
    await extendPortfolio(a.uid, a.months);
  } else if (a.product === "print") {
    await printPaid(a.orderId);
  } else if (a.product === "pro") {
    await applyPro(a.uid, a.tier, a.months, a.upgrade);
  } else if (a.product === "album") {
    await extendAlbumSub(a.uid, a.months);
  } else if (a.product === "faces") {
    const meta = await getMeta(a.galleryId);
    if (meta) {
      meta.faces = { ...(meta.faces ?? { enabled: true }), paid: true, enabled: true };
      await saveMeta(a.galleryId, meta);
    }
  }
}
