import { randomBytes } from "crypto";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { r2, BUCKET } from "@/lib/r2";

// Saldo konta fotografa (grosze) z historią operacji – profiles/<id>/wallet.json
export type WalletEntry = {
  id: string;
  at: string;
  type: "topup" | "bonus" | "spend" | "refund";
  amount: number; // grosze, dodatnie = wpływ, ujemne = wydatek
  description: string;
  ref?: string; // np. numer płatności
};
export type Wallet = { balance: number; history: WalletEntry[] };

// Kwoty doładowań (zł) i bonusy
export const TOPUPS: { amount: number; bonus: number }[] = [
  { amount: 30, bonus: 0 },
  { amount: 50, bonus: 0 },
  { amount: 100, bonus: 0 },
  { amount: 200, bonus: 10 },
];

const key = (uid: string) => `profiles/${uid}/wallet.json`;

export async function getWallet(uid: string): Promise<Wallet> {
  try {
    const res = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key(uid) }));
    const text = await res.Body?.transformToString();
    return text ? (JSON.parse(text) as Wallet) : { balance: 0, history: [] };
  } catch {
    return { balance: 0, history: [] };
  }
}

async function saveWallet(uid: string, w: Wallet) {
  await r2.send(new PutObjectCommand({ Bucket: BUCKET, Key: key(uid), Body: JSON.stringify(w), ContentType: "application/json" }));
}

// Kolejka zmian na instancję serwera, żeby dwie operacje naraz nie nadpisały sobie salda
const locks = new Map<string, Promise<unknown>>();
function serial<T>(uid: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(uid) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  locks.set(uid, next.catch(() => undefined));
  return next;
}

export function addEntries(uid: string, entries: Omit<WalletEntry, "id" | "at">[]) {
  return serial(uid, async () => {
    const w = await getWallet(uid);
    // To samo zdarzenie (np. powtórzone powiadomienie o płatności) księgujemy raz
    if (entries[0]?.ref && w.history.some((h) => h.ref === entries[0].ref && h.type === entries[0].type)) return w;
    const at = new Date().toISOString();
    for (const e of entries) {
      w.balance += e.amount;
      w.history.unshift({ ...e, id: randomBytes(6).toString("hex"), at });
    }
    w.history = w.history.slice(0, 500);
    await saveWallet(uid, w);
    return w;
  });
}

// Pobiera kwotę z salda; zwraca false, gdy środków jest za mało
export function spend(uid: string, amount: number, description: string, ref: string) {
  return serial(uid, async () => {
    const w = await getWallet(uid);
    if (w.balance < amount) return false;
    w.balance -= amount;
    w.history.unshift({ id: randomBytes(6).toString("hex"), at: new Date().toISOString(), type: "spend", amount: -amount, description, ref });
    w.history = w.history.slice(0, 500);
    await saveWallet(uid, w);
    return true;
  });
}

export const zlFromGr = (gr: number) =>
  `${(gr / 100).toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł`;
