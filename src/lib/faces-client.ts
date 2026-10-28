// „Znajdź siebie na zdjęciach” – rozpoznawanie twarzy w przeglądarce (biblioteka face-api, modele z CDN).
// Selfie gościa nigdy nie opuszcza telefonu: wysyłamy tylko liczbowy opis twarzy do porównania.

const LIB = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1/dist/face-api.esm.js";
const MODELS = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1/model/";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FaceApi = any;
let loading: Promise<FaceApi> | null = null;

async function lib(): Promise<FaceApi> {
  if (!loading) {
    loading = (async () => {
      const faceapi = await import(/* webpackIgnore: true */ LIB);
      const api = faceapi.default ?? faceapi;
      try {
        await api.tf.setBackend("webgl");
      } catch {
        /* zostaje domyślny */
      }
      await api.tf.ready();
      return api;
    })().catch((err) => {
      loading = null;
      throw err;
    });
  }
  return loading;
}

const loaded = new Set<string>();
async function nets(api: FaceApi, names: string[]) {
  for (const n of names) {
    if (loaded.has(n)) continue;
    await api.nets[n].loadFromUri(MODELS);
    loaded.add(n);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("img"));
    img.src = src;
  });
}

// Zmniejsza obraz (szybciej, a dokładność twarzy wystarczająca)
function toCanvas(img: CanvasImageSource & { width: number; height: number }, max: number) {
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * scale);
  c.height = Math.round(img.height * scale);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

const round = (d: Float32Array | number[]) => Array.from(d, (x) => Math.round(x * 10000) / 10000);

// Fotograf: opisy wszystkich twarzy na zdjęciach galerii
export async function indexPhotos(
  photos: { name: string; url: string }[],
  onProgress: (done: number, total: number) => void,
  shouldStop: () => boolean,
): Promise<Record<string, number[][]>> {
  const api = await lib();
  await nets(api, ["ssdMobilenetv1", "faceLandmark68Net", "faceRecognitionNet"]);
  const out: Record<string, number[][]> = {};
  const opts = new api.SsdMobilenetv1Options({ minConfidence: 0.45, maxResults: 40 });
  for (let i = 0; i < photos.length; i++) {
    if (shouldStop()) break;
    try {
      const img = await loadImage(photos[i].url);
      const found = await api.detectAllFaces(toCanvas(img, 1280), opts).withFaceLandmarks().withFaceDescriptors();
      out[photos[i].name] = found.map((f: { descriptor: Float32Array }) => round(f.descriptor));
    } catch {
      out[photos[i].name] = [];
    }
    onProgress(i + 1, photos.length);
  }
  return out;
}

// Gość: opis twarzy z selfie (null, gdy nie widać twarzy)
export async function selfieDescriptor(file: File): Promise<number[] | null> {
  const api = await lib();
  await nets(api, ["ssdMobilenetv1", "faceLandmark68Net", "faceRecognitionNet"]);
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const canvas = toCanvas(bmp, 1024);
  const found = await api
    .detectAllFaces(canvas, new api.SsdMobilenetv1Options({ minConfidence: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptors();
  if (!found.length) return null;
  // Największa twarz na zdjęciu = osoba robiąca selfie
  found.sort((a: { detection: { box: { area: number } } }, b: { detection: { box: { area: number } } }) => b.detection.box.area - a.detection.box.area);
  return round(found[0].descriptor);
}
