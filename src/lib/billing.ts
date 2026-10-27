import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { r2, BUCKET } from "@/lib/r2";

// Dane do faktury fotografa (zapamiętane w magazynie: profiles/<id>/billing.json)
export type Billing = {
  want: boolean;
  company: string;
  nip: string;
  street: string;
  postcode: string;
  city: string;
};

export const EMPTY_BILLING: Billing = { want: false, company: "", nip: "", street: "", postcode: "", city: "" };

const key = (uid: string) => `profiles/${uid}/billing.json`;

export async function getBilling(uid: string): Promise<Billing> {
  try {
    const res = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key(uid) }));
    const text = await res.Body?.transformToString();
    return text ? { ...EMPTY_BILLING, ...(JSON.parse(text) as Partial<Billing>) } : EMPTY_BILLING;
  } catch {
    return EMPTY_BILLING;
  }
}

export async function saveBilling(uid: string, b: Billing) {
  await r2.send(new PutObjectCommand({ Bucket: BUCKET, Key: key(uid), Body: JSON.stringify(b), ContentType: "application/json" }));
}

function nipValid(nip: string) {
  if (!/^\d{10}$/.test(nip)) return false;
  const w = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  const sum = w.reduce((s, x, i) => s + x * Number(nip[i]), 0);
  return sum % 11 === Number(nip[9]);
}

// Czyści i sprawdza dane; zwraca błąd albo poprawne dane
export function cleanBilling(raw: unknown): { ok: true; billing: Billing } | { ok: false; error: string } {
  const r = (raw ?? {}) as Partial<Record<keyof Billing, unknown>>;
  const s = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);
  const b: Billing = {
    want: Boolean(r.want),
    company: s(r.company, 200),
    nip: s(r.nip, 20).replace(/[\s-]/g, "").replace(/^PL/i, ""),
    street: s(r.street, 200),
    postcode: s(r.postcode, 10),
    city: s(r.city, 100),
  };
  if (!b.want) return { ok: true, billing: b };
  if (!b.company || !b.street || !b.postcode || !b.city) return { ok: false, error: "Uzupełnij dane do faktury." };
  if (!nipValid(b.nip)) return { ok: false, error: "Sprawdź NIP – powinien mieć 10 cyfr." };
  return { ok: true, billing: b };
}
