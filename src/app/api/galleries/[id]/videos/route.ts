import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import {
  CreateMultipartUploadCommand,
  UploadPartCommand,
  ListPartsCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { E } from "@/lib/api-lang";
import { r2, BUCKET, safeFileName } from "@/lib/r2";
import { getUser } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/owner";
import { getMeta, saveMeta, isExpired } from "@/lib/galleries";
import { cleanBilling, saveBilling } from "@/lib/billing";
import { spend, getWallet, zlFromGr } from "@/lib/wallet";
import { notifyAdmins } from "@/lib/email";
import { p24Enabled, newSessionId, saveOrder, registerTransaction } from "@/lib/p24";
import { videoPrefix, videoPrice, monthsLeft, startVideos, deleteVideo, type Video } from "@/lib/videos";
import { activePro, galleryOwnerId, proFits, proName, proBytes, proUsage, proVideoSeconds, fmtDuration } from "@/lib/pro";
import { formatBytes } from "@/lib/plans";
import { getLang } from "@/lib/lang-server";

export const runtime = "nodejs";

const PART = 32 * 1024 * 1024; // 32 MB na część – przy zerwaniu połączenia mniej do powtórzenia
const LEGACY_PART = 64 * 1024 * 1024;
const MAX_SIZE = 30 * 1024 ** 3; // limit Cloudflare Stream

type Body = Record<string, unknown> & { action?: string; videoId?: string };

// Filmy w galerii: wgrywanie oryginału w częściach prosto do R2, wycena po wgraniu, płatność
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const denied = await requireOwner(id);
  if (denied) return denied;
  const body = (await req.json().catch(() => null)) as Body | null;
  const meta = await getMeta(id);
  if (!body || !meta) return NextResponse.json({ error: await E("Nieprawidłowe dane.") }, { status: 400 });
  const videos = (meta.videos ??= []);
  const video = videos.find((v) => v.id === body.videoId);

  switch (body.action) {
    case "init": {
      if (!meta.plan || isExpired(meta)) return NextResponse.json({ error: await E("Film można dodać do opublikowanej galerii.") }, { status: 400 });
      const size = Number(body.size) || 0;
      if (size <= 0 || size > MAX_SIZE) return NextResponse.json({ error: await E("Film może mieć najwyżej 30 GB.") }, { status: 400 });
      // Wznowienie przerwanego wgrywania tego samego pliku – części już wgrane pomijamy
      const same = videos.find((v) => v.status === "uploading" && v.uploadId && v.size === size && v.name === safeFileName(String(body.name ?? "film.mp4")));
      if (same) {
        const partSize = same.partSize ?? LEGACY_PART;
        const total = Math.ceil(size / partSize);
        const done: number[] = [];
        try {
          let marker: string | undefined;
          do {
            const res = await r2.send(new ListPartsCommand({ Bucket: BUCKET, Key: same.key, UploadId: same.uploadId, PartNumberMarker: marker }));
            for (const p of res.Parts ?? []) {
              const n = p.PartNumber ?? 0;
              const expected = n === total ? size - (total - 1) * partSize : partSize;
              if (n >= 1 && Number(p.Size) === expected) done.push(n);
            }
            marker = res.IsTruncated ? String(res.NextPartNumberMarker) : undefined;
          } while (marker);
          return NextResponse.json({ ok: true, videoId: same.id, partSize, parts: total, done, resumed: true });
        } catch {
          // wgrywanie wygasło po stronie magazynu – zaczynamy od nowa
          videos.splice(videos.indexOf(same), 1);
        }
      }
      // Abonament Pro: film bez opłaty, ale liczony do puli miejsca
      if (meta.plan === "pro") {
        const owner = await galleryOwnerId(id);
        const sub = owner ? await activePro(owner) : null;
        if (!sub) return NextResponse.json({ error: await E("Abonament Pro się skończył – odnów go, aby dodawać filmy.") }, { status: 402 });
        const fit = await proFits(owner!, sub, size, false);
        // limit długości filmów w pakiecie
        const duration = Math.max(1, Math.round(Number(body.duration) || 60));
        const { videoSeconds } = await proUsage(owner!);
        if (videoSeconds + duration > proVideoSeconds(fit.tier)) {
          const en = (await getLang()) === "en";
          const left = fmtDuration(Math.max(0, proVideoSeconds(fit.tier) - videoSeconds), en ? "en" : "pl");
          return NextResponse.json(
            {
              error: en
                ? `${proName(fit.tier)} includes up to ${fit.tier.videoHours} h of video. Left: ${left}. Upgrade your subscription or delete older videos.`
                : `Abonament ${proName(fit.tier)} obejmuje filmy do ${fit.tier.videoHours} godzin. Zostało: ${left}. Zmień abonament na większy albo usuń starsze filmy.`,
            },
            { status: 402 },
          );
        }
        if (!fit.ok) {
          const en = (await getLang()) === "en";
          const free = formatBytes(Math.max(0, proBytes(fit.tier) - fit.used));
          return NextResponse.json(
            {
              error: en
                ? `This film won't fit in ${proName(fit.tier)}. Free space: ${free}. Upgrade your subscription or delete old galleries.`
                : `Film nie zmieści się w abonamencie ${proName(fit.tier)}. Wolne miejsce: ${free}. Zmień abonament na większy albo usuń stare galerie.`,
            },
            { status: 402 },
          );
        }
      }
      const name = safeFileName(String(body.name ?? "film.mp4"));
      const vid = randomBytes(5).toString("hex");
      const key = `${videoPrefix(id)}${vid}/${name}`;
      const type = String(body.type || "video/mp4").startsWith("video/") ? String(body.type) : "video/mp4";
      const up = await r2.send(new CreateMultipartUploadCommand({ Bucket: BUCKET, Key: key, ContentType: type }));
      const v: Video = {
        id: vid,
        name,
        key,
        size,
        duration: Math.max(1, Math.round(Number(body.duration) || 60)),
        status: "uploading",
        createdAt: new Date().toISOString(),
        uploadId: up.UploadId,
        partSize: PART,
      };
      videos.push(v);
      await saveMeta(id, meta);
      return NextResponse.json({ ok: true, videoId: vid, partSize: PART, parts: Math.ceil(size / PART), done: [] });
    }
    case "parts": {
      if (!video?.uploadId) return NextResponse.json({ error: await E("Nie znaleziono filmu.") }, { status: 404 });
      const nums = (Array.isArray(body.parts) ? body.parts : []).map(Number).filter((n) => n >= 1 && n <= 10000).slice(0, 100);
      const urls: Record<number, string> = {};
      await Promise.all(
        nums.map(async (n) => {
          urls[n] = await getSignedUrl(r2, new UploadPartCommand({ Bucket: BUCKET, Key: video.key, UploadId: video.uploadId, PartNumber: n }), {
            expiresIn: 6 * 3600,
          });
        }),
      );
      return NextResponse.json({ ok: true, urls });
    }
    case "complete": {
      if (!video?.uploadId) return NextResponse.json({ error: await E("Nie znaleziono filmu.") }, { status: 404 });
      // Znaczniki części odczytujemy po stronie serwera – przeglądarka nie musi ich widzieć
      const parts: { ETag?: string; PartNumber?: number }[] = [];
      let marker: string | undefined;
      do {
        const res = await r2.send(new ListPartsCommand({ Bucket: BUCKET, Key: video.key, UploadId: video.uploadId, PartNumberMarker: marker }));
        for (const p of res.Parts ?? []) parts.push({ ETag: p.ETag, PartNumber: p.PartNumber });
        marker = res.IsTruncated ? String(res.NextPartNumberMarker) : undefined;
      } while (marker);
      parts.sort((a, b) => (a.PartNumber ?? 0) - (b.PartNumber ?? 0));
      await r2.send(new CompleteMultipartUploadCommand({ Bucket: BUCKET, Key: video.key, UploadId: video.uploadId, MultipartUpload: { Parts: parts } }));
      const head = await r2.send(new HeadObjectCommand({ Bucket: BUCKET, Key: video.key }));
      video.size = Number(head.ContentLength ?? video.size);
      video.uploadId = undefined;
      video.status = "unpaid";
      if (meta.plan === "pro") {
        // w abonamencie Pro film nie wymaga opłaty – od razu przygotowujemy podgląd
        video.price = 0;
        video.months = undefined;
        await startVideos(videos, [video.id]);
        await saveMeta(id, meta);
        return NextResponse.json({ ok: true, video });
      }
      video.months = monthsLeft(meta.expiresAt);
      video.price = videoPrice(video.size, video.duration, video.months);
      await saveMeta(id, meta);
      return NextResponse.json({ ok: true, video });
    }
    case "abort":
    case "delete": {
      if (!video) return NextResponse.json({ ok: true });
      if (video.uploadId) {
        await r2.send(new AbortMultipartUploadCommand({ Bucket: BUCKET, Key: video.key, UploadId: video.uploadId })).catch(() => undefined);
      }
      await deleteVideo(video);
      meta.videos = videos.filter((v) => v.id !== video.id);
      await saveMeta(id, meta);
      return NextResponse.json({ ok: true });
    }
    case "pay": {
      const unpaid = videos.filter((v) => v.status === "unpaid");
      if (unpaid.length === 0) return NextResponse.json({ error: await E("Nie ma filmów do opłacenia.") }, { status: 400 });
      // Cena zawsze liczona na nowo – do aktualnej daty końca galerii
      for (const v of unpaid) {
        v.months = monthsLeft(meta.expiresAt);
        v.price = videoPrice(v.size, v.duration, v.months);
      }
      const amount = unpaid.reduce((s, v) => s + (v.price ?? 0), 0);
      const ids = unpaid.map((v) => v.id);
      const inv = cleanBilling(body.invoice);
      if (!inv.ok) return NextResponse.json({ error: await E(inv.error) }, { status: 400 });
      const { user } = await getUser();
      if (!user) return NextResponse.json({ error: await E("Zaloguj się ponownie.") }, { status: 401 });
      if (body.invoice) await saveBilling(user.id, inv.billing).catch(() => undefined);
      const label = `filmy w galerii (${unpaid.length}) – ${meta.title}`;

      if (body.pay === "wallet" || !p24Enabled()) {
        if (body.pay === "wallet") {
          const ok = await spend(user.id, amount * 100, label, `videos-${id}-${Date.now()}`);
          if (!ok) return NextResponse.json({ error: await E("Za mało środków na koncie. Doładuj konto albo zapłać BLIK-iem.") }, { status: 402 });
          const left = (await getWallet(user.id)).balance;
          await notifyAdmins(`Zakup z salda: ${zlFromGr(amount * 100)} – ${user.email}`, "Nowy zakup z salda", [
            `Kwota: ${zlFromGr(amount * 100)} (z salda konta).`,
            `Za: ${label}.`,
            `Konto: ${user.email}. Pozostało na saldzie: ${zlFromGr(left)}.`,
          ]);
        }
        await startVideos(videos, ids);
        await saveMeta(id, meta);
        return NextResponse.json({ ok: true });
      }

      await saveMeta(id, meta);
      const order = {
        sessionId: newSessionId(),
        galleryId: id,
        ownerId: user.id,
        email: user.email ?? "",
        amount: amount * 100,
        action: { action: "videos" as const, galleryId: id, ids },
        description: `Lenslie - filmy w galerii - ${meta.title}`.slice(0, 1024),
        status: "pending" as const,
        invoice: inv.billing.want ? inv.billing : null,
        createdAt: new Date().toISOString(),
      };
      await saveOrder(order);
      try {
        return NextResponse.json({ ok: true, redirect: await registerTransaction(order, new URL(req.url).origin) });
      } catch (err) {
        return NextResponse.json({ error: await E(err instanceof Error ? err.message : "Błąd płatności.") }, { status: 502 });
      }
    }
  }
  return NextResponse.json({ error: await E("Nieznana operacja.") }, { status: 400 });
}
