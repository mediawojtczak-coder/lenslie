import { GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, BUCKET, baseName, galleryPrefix } from "@/lib/r2";

export type Photo = {
  name: string;
  fileName: string;
  webUrl: string;
  downloadUrl: string;
};

async function listKeys(prefix: string) {
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const res = await r2.send(
      new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix, ContinuationToken: token }),
    );
    for (const obj of res.Contents ?? []) if (obj.Key) keys.push(obj.Key);
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

// Zwraca zdjęcia galerii z tymczasowymi linkami (ważnymi 2 godziny).
export async function getGalleryPhotos(id: string): Promise<Photo[]> {
  if (!process.env.R2_ENDPOINT) return [];
  const prefix = galleryPrefix(id);

  const [webKeys, originalKeys] = await Promise.all([
    listKeys(`${prefix}web/`),
    listKeys(`${prefix}original/`),
  ]);

  const originals = new Map<string, string>();
  for (const key of originalKeys) {
    const file = key.slice(`${prefix}original/`.length);
    originals.set(baseName(file), key);
  }

  webKeys.sort((a, b) => a.localeCompare(b, "pl", { numeric: true }));

  return Promise.all(
    webKeys.map(async (key) => {
      const file = key.slice(`${prefix}web/`.length);
      const name = baseName(file);
      const originalKey = originals.get(name) ?? key;
      const originalFile = originalKey.split("/").pop() ?? file;

      const [webUrl, downloadUrl] = await Promise.all([
        getSignedUrl(r2, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: 7200 }),
        getSignedUrl(
          r2,
          new GetObjectCommand({
            Bucket: BUCKET,
            Key: originalKey,
            ResponseContentDisposition: `attachment; filename="${originalFile}"`,
          }),
          { expiresIn: 7200 },
        ),
      ]);

      return { name, fileName: originalFile, webUrl, downloadUrl };
    }),
  );
}
