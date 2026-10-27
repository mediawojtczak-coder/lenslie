import { randomBytes } from "crypto";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { r2, BUCKET } from "@/lib/r2";
import { addEntries } from "@/lib/wallet";
import { adminClient } from "@/lib/supabase/admin";
import { sendEmail, emailLayout, siteUrl } from "@/lib/email";
import { getUserLang } from "@/lib/lang-server";

// Program poleceń: obie strony dostają REWARD zł na saldo, gdy polecony wpłaci łącznie co najmniej THRESHOLD zł
export const REWARD = 20;
export const THRESHOLD = 30;

type Invite = { uid: string; email: string; at: string; paid: number; rewarded: boolean };
type RefUser = { code: string; invited: Invite[] };
type Referral = { referrer: string; at: string; paid: number; rewarded: boolean };

async function getJson<T>(key: string): Promise<T | null> {
  try {
    const res = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    const text = await res.Body?.transformToString();
    return text ? (JSON.parse(text) as T) : null;
  } catch {
    return null;
  }
}
const putJson = (key: string, v: unknown) =>
  r2.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: JSON.stringify(v), ContentType: "application/json" }));

const userKey = (uid: string) => `referrals/users/${uid}.json`;
const codeKey = (code: string) => `referrals/codes/${code}.json`;
const refKey = (uid: string) => `referrals/referred/${uid}.json`;

const maskEmail = (e: string) => e.replace(/^(.{2})[^@]*(@.*)$/, "$1•••$2");

export async function getRefUser(uid: string): Promise<RefUser> {
  const existing = await getJson<RefUser>(userKey(uid));
  if (existing) return existing;
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  let code = "";
  for (let tries = 0; tries < 5; tries++) {
    code = Array.from(randomBytes(6), (b) => alphabet[b % alphabet.length]).join("");
    if (!(await getJson(codeKey(code)))) break;
  }
  const u: RefUser = { code, invited: [] };
  await putJson(codeKey(code), { uid });
  await putJson(userKey(uid), u);
  return u;
}

export function cleanCode(code: unknown) {
  const c = String(code ?? "").trim().toLowerCase();
  return /^[a-z0-9]{6}$/.test(c) ? c : null;
}

// Zapisuje, kto polecił nowego fotografa (przy rejestracji)
export async function recordReferral(newUid: string, email: string, code: string | null) {
  if (!code) return;
  const owner = await getJson<{ uid: string }>(codeKey(code));
  if (!owner || owner.uid === newUid || (await getJson(refKey(newUid)))) return;
  await putJson(refKey(newUid), { referrer: owner.uid, at: new Date().toISOString(), paid: 0, rewarded: false } satisfies Referral);
  const u = await getRefUser(owner.uid);
  u.invited.unshift({ uid: newUid, email: maskEmail(email), at: new Date().toISOString(), paid: 0, rewarded: false });
  await putJson(userKey(owner.uid), u);
}

// Po każdej opłaconej płatności: gdy polecony przekroczy próg, obie strony dostają bonus (raz)
export async function referralPayment(uid: string, amountGr: number) {
  const ref = await getJson<Referral>(refKey(uid));
  if (!ref || ref.rewarded) return;
  ref.paid += amountGr;
  const reached = ref.paid >= THRESHOLD * 100;
  if (reached) ref.rewarded = true;
  await putJson(refKey(uid), ref);

  const u = await getRefUser(ref.referrer);
  const inv = u.invited.find((i) => i.uid === uid);
  if (inv) {
    inv.paid = ref.paid;
    inv.rewarded = ref.rewarded;
    await putJson(userKey(ref.referrer), u);
  }
  if (!reached) return;

  await addEntries(uid, [{ type: "bonus", amount: REWARD * 100, description: "Bonus powitalny z polecenia", ref: `ref-${uid}` }]);
  await addEntries(ref.referrer, [
    { type: "bonus", amount: REWARD * 100, description: `Bonus za polecenie (${inv?.email ?? "nowy fotograf"})`, ref: `ref-${uid}` },
  ]);

  // Mail do polecającego
  const db = adminClient();
  const to = db ? (await db.auth.admin.getUserById(ref.referrer)).data?.user?.email : null;
  if (to && (await getUserLang(ref.referrer)) === "en") {
    await sendEmail({
      to,
      subject: `You get PLN ${REWARD} for recommending Lenslie`,
      html: emailLayout(
        "Thank you for the referral!",
        [`The photographer you referred has started using Lenslie. PLN ${REWARD} has been added to your balance – you can use it to publish galleries.`],
        { label: "See balance", url: `${siteUrl()}/panel/konto#saldo` },
        "en",
      ),
    }).catch(() => undefined);
  } else if (to) {
    await sendEmail({
      to,
      subject: `Dostajesz ${REWARD} zł za polecenie Lenslie`,
      html: emailLayout(
        "Dziękujemy za polecenie!",
        [`Fotograf, którego poleciłeś, zaczął korzystać z Lenslie. Na Twoje saldo trafiło ${REWARD} zł – możesz je wykorzystać na publikację galerii.`],
        { label: "Zobacz saldo", url: `${siteUrl()}/panel/konto#saldo` },
      ),
    }).catch(() => undefined);
  }
}

export async function isReferred(uid: string) {
  return Boolean(await getJson(refKey(uid)));
}
