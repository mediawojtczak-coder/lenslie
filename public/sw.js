// Lenslie – service worker aplikacji. Niczego nie zapisuje poza stroną „brak internetu”:
// panel i galerie zawsze pochodzą prosto z serwera, więc zmiany są widoczne od razu.
const OFFLINE = "/offline.html";
const CACHE = "lenslie-offline-v1";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.add(OFFLINE)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

// Tylko otwieranie stron: bez internetu pokazujemy krótką informację zamiast błędu przeglądarki
self.addEventListener("fetch", (e) => {
  if (e.request.mode !== "navigate") return;
  e.respondWith(fetch(e.request).catch(() => caches.match(OFFLINE)));
});
