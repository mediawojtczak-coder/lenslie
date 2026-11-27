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

// Powiadomienia push (tylko konto administratora: nowi fotografowie i sprzedaż)
self.addEventListener("push", (e) => {
  let d = { title: "Lenslie", body: "", url: "/admin" };
  try {
    d = { ...d, ...e.data.json() };
  } catch {}
  e.waitUntil(self.registration.showNotification(d.title, { body: d.body, icon: "/icon-192.png", badge: "/icon-192.png", data: { url: d.url } }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/admin";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) {
          c.navigate(url).catch(() => undefined);
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
