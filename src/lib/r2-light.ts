import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2, BUCKET } from "@/lib/r2";
import { fastSignedUrl, fastSigningOk } from "@/lib/presign";

// Zapis pustego pliku-znacznika (statystyki szybkości i wejść) bez AWS SDK – to lżejsze dla serwera.
// Gdy szybkie podpisy nie działają, zapis idzie przez SDK.
export async function putEmpty(key: string) {
  if (await fastSigningOk()) {
    const res = await fetch(fastSignedUrl("PUT", key), { method: "PUT", body: "", cache: "no-store" }).catch(() => null);
    if (res?.ok) return;
  }
  await r2.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: "", ContentType: "text/plain" }));
}
