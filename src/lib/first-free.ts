import { GetObjectCommand } from "@aws-sdk/client-s3";
import { r2, BUCKET } from "@/lib/r2";
import { claimOnce } from "@/lib/r2-light";

// Pierwsza galeria gratis (wersja angielska z płatnościami kartą): jedna publikacja do 3 miesięcy, dowolny pakiet
export const FIRST_FREE_MAX_MONTHS = 3;
const key = (uid: string) => `profiles/${uid}/first-free`;

export async function firstFreeAvailable(uid: string) {
  try {
    await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key(uid) }));
    return false;
  } catch {
    return true;
  }
}

export const claimFirstFree = (uid: string) => claimOnce(key(uid));
