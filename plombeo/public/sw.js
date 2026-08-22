/*
 * Service worker — squelette hors-ligne de la Phase 1.
 *
 * Périmètre volontairement minimal : mettre en cache la coquille de
 * l'application et servir une page lisible en cas de coupure réseau.
 *
 * La vraie synchronisation hors-ligne (file de mutations, idempotence,
 * résolution de conflits) est l'objet de la Phase 3, puis de la Phase 12.
 * Rien ici ne prétend la fournir.
 */

const VERSION = "plombeo-v1";
const RESSOURCES = ["/hors-ligne"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(RESSOURCES)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Supprime les caches des versions précédentes pour éviter de servir
  // indéfiniment une ancienne coquille applicative.
  event.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((c) => c !== VERSION).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const requete = event.request;

  // Seules les navigations sont traitées. Les appels de données ne sont
  // délibérément pas mis en cache : servir un devis ou une facture périmés
  // depuis un cache serait pire que d'afficher une erreur franche.
  if (requete.mode !== "navigate") return;

  event.respondWith(
    fetch(requete).catch(async () => {
      const cache = await caches.open(VERSION);
      const reponse = await cache.match("/hors-ligne");
      return (
        reponse ??
        new Response("Vous êtes hors ligne.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        })
      );
    }),
  );
});
