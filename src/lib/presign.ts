import { createHash, createHmac } from "crypto";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, BUCKET } from "@/lib/r2";

// Szybkie podpisywanie linków do plików w R2 (AWS SigV4, zapytanie GET).
// AWS SDK potrzebuje ok. 1–2 ms na link – przy galerii z 900 zdjęciami (3 linki na zdjęcie) to kilka sekund
// przy każdym otwarciu strony. Tu liczymy podpis bezpośrednio (mikrosekundy).
// Bezpiecznik: przy pierwszym użyciu porównujemy wynik z SDK – jeśli się różni, zostajemy przy SDK.

const enc = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
const hmac = (k: Buffer | string, s: string) => createHmac("sha256", k).update(s, "utf8").digest();

export type SignInput = {
  host: string;
  path: string; // już zakodowana ścieżka, np. /bucket/klucz
  params: [string, string][];
  region: string;
  secret: string;
  amz: string; // 20261030T120000Z
};

let cachedKey: { id: string; key: Buffer } | null = null;

// Czysty SigV4 dla zapytania z podpisem w adresie (sprawdzony na przykładzie z dokumentacji AWS)
export function sigv4Query({ host, path, params, region, secret, amz }: SignInput) {
  const day = amz.slice(0, 8);
  const query = params
    .map(([k, v]) => [enc(k), enc(v)] as const)
    .sort(([a, x], [b, y]) => (a < b ? -1 : a > b ? 1 : x < y ? -1 : x > y ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  const payload = params.find(([k]) => k === "X-Amz-Content-Sha256")?.[1] ?? "UNSIGNED-PAYLOAD";
  const canonical = ["GET", path, query, `host:${host}\n`, "host", payload].join("\n");
  const scope = `${day}/${region}/s3/aws4_request`;
  const toSign = ["AWS4-HMAC-SHA256", amz, scope, createHash("sha256").update(canonical, "utf8").digest("hex")].join("\n");
  const id = `${day}|${region}|${secret}`;
  if (cachedKey?.id !== id) cachedKey = { id, key: hmac(hmac(hmac(hmac(`AWS4${secret}`, day), region), "s3"), "aws4_request") };
  const signature = createHmac("sha256", cachedKey.key).update(toSign, "utf8").digest("hex");
  return { query, signature };
}

type Opts = { expiresIn?: number; disposition?: string; now?: Date };

// Styl adresu jak w SDK: bucket w nazwie hosta (lenslie.<konto>.r2…) albo w ścieżce (/lenslie/…)
let virtualHost = true;

function fastPresign(key: string, opts: Opts = {}) {
  const endpoint = new URL(process.env.R2_ENDPOINT ?? "");
  const host = virtualHost ? `${BUCKET}.${endpoint.host}` : endpoint.host;
  const accessKey = process.env.R2_ACCESS_KEY_ID ?? "";
  const secret = process.env.R2_SECRET_ACCESS_KEY ?? "";
  const amz = (opts.now ?? new Date()).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const keyPath = key.split("/").map(enc).join("/");
  const path = virtualHost ? `/${keyPath}` : `/${enc(BUCKET)}/${keyPath}`;
  const params: [string, string][] = [
    ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
    ["X-Amz-Content-Sha256", "UNSIGNED-PAYLOAD"],
    ["X-Amz-Credential", `${accessKey}/${amz.slice(0, 8)}/auto/s3/aws4_request`],
    ["X-Amz-Date", amz],
    ["X-Amz-Expires", String(opts.expiresIn ?? 7200)],
    ["X-Amz-SignedHeaders", "host"],
    ["x-id", "GetObject"],
  ];
  if (opts.disposition) params.push(["response-content-disposition", opts.disposition]);
  const { query, signature } = sigv4Query({ host, path, params, region: "auto", secret, amz });
  return `${endpoint.protocol}//${host}${path}?${query}&X-Amz-Signature=${signature}`;
}

const sdkPresign = (key: string, opts: Opts = {}) =>
  getSignedUrl(
    r2,
    new GetObjectCommand({ Bucket: BUCKET, Key: key, ...(opts.disposition ? { ResponseContentDisposition: opts.disposition } : {}) }),
    { expiresIn: opts.expiresIn ?? 7200, ...(opts.now ? { signingDate: opts.now } : {}) },
  );


let check: Promise<boolean> | null = null;
function fastIsSafe() {
  check ??= (async () => {
    try {
      const now = new Date();
      now.setMilliseconds(0);
      const key = "galleries/test/web/Zdjęcie (1) ąę+a~b!.jpg";
      const disposition = 'attachment; filename="Zdjęcie (1).jpg"';
      const b = await sdkPresign(key, { disposition, now });
      virtualHost = new URL(b).host.startsWith(`${BUCKET}.`);
      const a = fastPresign(key, { disposition, now });
      // ten sam host, ścieżka i wszystkie parametry z podpisem (kolejność bez znaczenia) → nasze linki są poprawne
      const norm = (u: string) => {
        const x = new URL(u);
        return `${x.host}${x.pathname}?${[...x.searchParams.entries()].map(([k, v]) => `${k}=${v}`).sort().join("&")}`;
      };
      const same = norm(a) === norm(b);
      if (!same) console.error("presign: szybkie podpisy różnią się od SDK – używam SDK", { a, b });
      return same;
    } catch (err) {
      console.error("presign check:", err);
      return false;
    }
  })();
  return check;
}

// Podpisany link do pobrania/obejrzenia pliku z R2
export async function presignGet(key: string, opts: Opts = {}): Promise<string> {
  if (await fastIsSafe()) return fastPresign(key, opts);
  return sdkPresign(key, opts);
}

// Wersja dla wielu linków naraz: jedno sprawdzenie, potem szybkie podpisy synchronicznie
export async function presigner(): Promise<(key: string, opts?: Opts) => Promise<string> | string> {
  return (await fastIsSafe()) ? fastPresign : sdkPresign;
}
