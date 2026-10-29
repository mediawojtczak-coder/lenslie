import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { r2, BUCKET } from "@/lib/r2";
import { sourceLabel, type Touch } from "@/lib/source-touch";

export * from "@/lib/source-touch";

export type SignupSource = Touch & { label: string; ref?: string; at: string };

const key = (uid: string) => `signup-sources/${uid}.json`;

export async function saveSignupSource(uid: string, t: Touch | null, ref?: string | null) {
  const v: SignupSource = { ...(t ?? {}), label: sourceLabel(t, ref), ...(ref ? { ref } : {}), at: new Date().toISOString() };
  await r2.send(new PutObjectCommand({ Bucket: BUCKET, Key: key(uid), Body: JSON.stringify(v), ContentType: "application/json" }));
  return v;
}

export async function getSignupSource(uid: string): Promise<SignupSource | null> {
  try {
    const res = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key(uid) }));
    const text = await res.Body?.transformToString();
    return text ? (JSON.parse(text) as SignupSource) : null;
  } catch {
    return null;
  }
}

// Krótki opis do tabeli w panelu administratora
export function sourceDetail(v: SignupSource | null) {
  if (!v) return "";
  return [v.c && `kampania: ${v.c}`, v.r && v.label !== v.r && `z: ${v.r}`, v.l && v.l !== "/" && `wejście: ${v.l}`, v.ref && `kod: ${v.ref}`]
    .filter(Boolean)
    .join(" · ");
}
