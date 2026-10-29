import { NextResponse } from "next/server";
import { E } from "@/lib/api-lang";
import { getUser } from "@/lib/supabase/server";
import { purchase } from "@/lib/purchase";
import { fmtDuration, proVideoSeconds, getProSub, proActive, proUsage, proTier, proName, proPrice, proHardLimit, proUpgradeCost, proIsBigger } from "@/lib/pro";
import { formatBytes } from "@/lib/plans";
import { getLang } from "@/lib/lang-server";

export const runtime = "nodejs";

// Abonament Pro: zakup / przedłużenie (miesiąc albo rok) i zmiana na większy pakiet w trakcie okresu
export async function POST(req: Request) {
  const { user } = await getUser();
  if (!user) return NextResponse.json({ error: await E("Zaloguj się ponownie.") }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { action?: string; tier?: string; months?: number; pay?: string; invoice?: unknown } | null;
  const tier = proTier(body?.tier);
  if (!tier) return NextResponse.json({ error: await E("Wybierz pakiet.") }, { status: 400 });
  const cur = await getProSub(user.id);
  const active = proActive(cur);

  if (body?.action === "upgrade") {
    if (!active) return NextResponse.json({ error: await E("Abonament nie jest aktywny – wybierz pakiet i okres.") }, { status: 400 });
    const from = proTier(cur!.tier)!;
    if (!proIsBigger(tier, from)) return NextResponse.json({ error: await E("Pakiet można zmienić tylko na większy.") }, { status: 400 });
    return purchase({
      req,
      user,
      amount: proUpgradeCost(from, tier, cur!.paidUntil, cur!.months === 12 ? 12 : 1),
      label: `zmiana abonamentu na ${proName(tier)}`,
      pay: body.pay,
      invoice: body.invoice,
      action: { action: "product", product: "pro", uid: user.id, tier: tier.id, months: 0, upgrade: true },
      returnPath: "/panel/pro",
    });
  }

  const months = Number(body?.months) === 12 ? 12 : 1;
  if (active && tier.id !== cur!.tier) {
    const bigger = proIsBigger(tier, proTier(cur!.tier)!);
    return NextResponse.json(
      {
        error: await E(
          bigger
            ? "Masz aktywny abonament – użyj „Zmień na większy”, a potem przedłuż."
            : "Mniejszy pakiet wybierzesz po końcu obecnego okresu.",
        ),
      },
      { status: 400 },
    );
  }
  const { bytes, videoSeconds } = await proUsage(user.id);
  if (videoSeconds > proVideoSeconds(tier)) {
    const en = (await getLang()) === "en";
    return NextResponse.json(
      {
        error: en
          ? `Your galleries have ${fmtDuration(videoSeconds, "en")} of video, and ${proName(tier)} includes up to ${tier.videoHours} h – choose a bigger plan or delete some videos.`
          : `Filmy w Twoich galeriach trwają ${fmtDuration(videoSeconds)}, a ${proName(tier)} obejmuje do ${tier.videoHours} h – wybierz większy pakiet albo usuń część filmów.`,
      },
      { status: 400 },
    );
  }
  if (bytes > proHardLimit(tier)) {
    const en = (await getLang()) === "en";
    return NextResponse.json(
      {
        error: en
          ? `Your galleries use ${formatBytes(bytes)} – choose a bigger plan or delete some galleries.`
          : `Twoje galerie zajmują ${formatBytes(bytes)} – wybierz większy pakiet albo usuń część galerii.`,
      },
      { status: 400 },
    );
  }
  return purchase({
    req,
    user,
    amount: proPrice(tier, months),
    label: `abonament ${proName(tier)}, ${months === 12 ? "12 mies." : "1 mies."}`,
    pay: body?.pay,
    invoice: body?.invoice,
    action: { action: "product", product: "pro", uid: user.id, tier: tier.id, months },
    returnPath: "/panel/pro",
  });
}
