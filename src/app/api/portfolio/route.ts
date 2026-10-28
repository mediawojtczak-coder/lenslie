import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { E } from "@/lib/api-lang";
import { r2, BUCKET } from "@/lib/r2";
import { getUser } from "@/lib/supabase/server";
import { getLang } from "@/lib/lang-server";
import { purchase } from "@/lib/purchase";
import {
  getSite,
  saveSite,
  emptySite,
  claimSlug,
  slugify,
  photoKey,
  PORTFOLIO_PRICES,
  PORTFOLIO_MAX_PHOTOS,
  type Service,
} from "@/lib/portfolio";

export const runtime = "nodejs";

const str = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);

// Strona portfolio fotografa: treść, adres, zdjęcia i abonament
export async function POST(req: Request) {
  const { user } = await getUser();
  if (!user) return NextResponse.json({ error: await E("Zaloguj się ponownie.") }, { status: 401 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: await E("Nieprawidłowe dane.") }, { status: 400 });
  const site = (await getSite(user.id)) ?? emptySite(user.id, "", await getLang());

  switch (body.action) {
    case "save": {
      const slug = slugify(str(body.slug, 40));
      if (slug !== site.slug) {
        if (!(await claimSlug(site, slug))) return NextResponse.json({ error: await E("Ten adres strony jest zajęty albo niepoprawny.") }, { status: 409 });
      }
      site.title = str(body.title, 80);
      site.tagline = str(body.tagline, 160);
      site.about = str(body.about, 3000);
      site.city = str(body.city, 80);
      site.phone = str(body.phone, 30);
      site.instagram = str(body.instagram, 120);
      site.facebook = str(body.facebook, 160);
      site.showBookings = Boolean(body.showBookings);
      site.dark = Boolean(body.dark);
      site.lang = body.lang === "en" ? "en" : "pl";
      site.services = (Array.isArray(body.services) ? body.services : [])
        .slice(0, 12)
        .map((s: Service) => ({ name: str(s?.name, 80), price: str(s?.price, 40), desc: str(s?.desc, 400) }))
        .filter((s) => s.name);
      if (body.consent && !site.consentAt) site.consentAt = new Date().toISOString();
      if (!body.consent) site.consentAt = undefined;
      await saveSite(site);
      return NextResponse.json({ ok: true, slug: site.slug });
    }
    case "photo-url": {
      if (site.photos.length >= PORTFOLIO_MAX_PHOTOS) return NextResponse.json({ error: await E("Strona może mieć najwyżej 40 zdjęć.") }, { status: 400 });
      const name = `${Date.now().toString(36)}${randomBytes(3).toString("hex")}.jpg`;
      const url = await getSignedUrl(r2, new PutObjectCommand({ Bucket: BUCKET, Key: photoKey(user.id, name), ContentType: "image/jpeg" }), { expiresIn: 900 });
      return NextResponse.json({ ok: true, url, name });
    }
    case "photo-done": {
      const name = str(body.name, 40);
      if (/^[a-z0-9]+\.jpg$/.test(name) && !site.photos.includes(name) && site.photos.length < PORTFOLIO_MAX_PHOTOS) site.photos.push(name);
      await saveSite(site);
      return NextResponse.json({ ok: true });
    }
    case "photo-delete": {
      const name = str(body.name, 40);
      if (site.photos.includes(name)) {
        await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: photoKey(user.id, name) })).catch(() => undefined);
        site.photos = site.photos.filter((p) => p !== name);
        await saveSite(site);
      }
      return NextResponse.json({ ok: true });
    }
    case "photo-cover": {
      const name = str(body.name, 40);
      if (site.photos.includes(name)) {
        site.photos = [name, ...site.photos.filter((p) => p !== name)];
        await saveSite(site);
      }
      return NextResponse.json({ ok: true });
    }
    case "pay": {
      const months = Number(body.months) === 12 ? 12 : 1;
      if (!site.slug) return NextResponse.json({ error: await E("Najpierw zapisz adres strony.") }, { status: 400 });
      return purchase({
        req,
        user,
        amount: PORTFOLIO_PRICES[months],
        label: `strona portfolio, ${months === 12 ? "12 mies." : "1 mies."}`,
        pay: body.pay,
        invoice: body.invoice,
        action: { action: "product", product: "portfolio", uid: user.id, months },
        returnPath: "/panel/strona",
      });
    }
  }
  return NextResponse.json({ error: await E("Nieznana operacja.") }, { status: 400 });
}
