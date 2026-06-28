// Service worker Resto Pilot HACCP.
// Rôle : rendre l'app installable (PWA) et permettre l'ouverture hors-ligne via
// un cache d'app-shell + une page de repli. La file d'attente des saisies est
// gérée côté application (IndexedDB) et rejouée à la reconnexion.

const CACHE = "rph-shell-v1";
const OFFLINE_URL = "/offline";
const SHELL = [OFFLINE_URL, "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // ne jamais intercepter les écritures (POST API)

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navigations : réseau d'abord, repli sur la page hors-ligne.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() =>
        caches.match(OFFLINE_URL).then((r) => r || new Response("Hors-ligne", { status: 503 }))
      )
    );
    return;
  }

  // Assets statiques : cache d'abord, puis réseau (et mise en cache).
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          })
      )
    );
  }
});
