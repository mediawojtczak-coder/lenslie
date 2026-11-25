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

// Jednorazowa „blokada”: zapisuje plik tylko, jeśli jeszcze nie istnieje (If-None-Match: *).
// true – udało się (pierwszy raz), false – ktoś był pierwszy.
export async function claimOnce(key: string) {
  if (await fastSigningOk()) {
    const res = await fetch(fastSignedUrl("PUT", key), { method: "PUT", body: "1", headers: { "If-None-Match": "*" }, cache: "no-store" }).catch(() => null);
    if (res?.ok) return true;
    if (res?.status === 412) return false;
  }
  try {
    await r2.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: "1", ContentType: "text/plain", IfNoneMatch: "*" }));
    return true;
  } catch (e) {
    const err = e as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (err?.name === "PreconditionFailed" || err?.$metadata?.httpStatusCode === 412) return false;
    throw e;
  }
}
