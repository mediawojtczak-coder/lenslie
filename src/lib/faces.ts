import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, BUCKET, galleryPrefix } from "@/lib/r2";

// Indeks twarzy galerii (opisy liczbowe, bez zdjęć twarzy). Zostaje na serwerze – klient wysyła tylko opis swojego selfie.
export const FACES_PRICE = 49; // zł za galerię
const THRESHOLD = 0.5; // im mniej, tym ostrzej

const key = (id: string) => `${galleryPrefix(id)}faces.json`;
type Index = { v: 1; photos: Record<string, number[][]> };

export const indexGetUrl = (id: string) => getSignedUrl(r2, new GetObjectCommand({ Bucket: BUCKET, Key: key(id) }), { expiresIn: 600 });
export const indexPutUrl = (id: string) =>
  getSignedUrl(r2, new PutObjectCommand({ Bucket: BUCKET, Key: key(id), ContentType: "application/json" }), { expiresIn: 3600 });
export const deleteIndex = (id: string) => r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key(id) })).catch(() => undefined);

async function getIndex(id: string): Promise<Index | null> {
  try {
    const res = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key(id) }));
    return JSON.parse((await res.Body?.transformToString()) ?? "null");
  } catch {
    return null;
  }
}

// Zdjęcia, na których jest osoba z selfie – od najbardziej podobnych
export async function searchFaces(id: string, d: number[]): Promise<string[]> {
  const index = await getIndex(id);
  if (!index) return [];
  const hits: { name: string; dist: number }[] = [];
  for (const [name, faces] of Object.entries(index.photos)) {
    let best = Infinity;
    for (const f of faces) {
      let s = 0;
      for (let i = 0; i < 128; i++) {
        const x = f[i] - d[i];
        s += x * x;
      }
      if (s < best) best = s;
    }
    const dist = Math.sqrt(best);
    if (dist < THRESHOLD) hits.push({ name, dist });
  }
  return hits.sort((a, b) => a.dist - b.dist).map((h) => h.name);
}
