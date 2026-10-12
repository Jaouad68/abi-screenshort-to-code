"use client";

import { useEffect } from "react";

/**
 * Enregistre le service worker côté navigateur.
 *
 * Uniquement en production : en développement, un service worker actif sert des
 * ressources en cache et masque les modifications de code en cours.
 */
export function EnregistrerServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch((erreur) => {
      // L'échec d'enregistrement ne doit pas empêcher l'utilisation de
      // l'application : elle reste parfaitement fonctionnelle en ligne.
      console.error("[pwa] enregistrement du service worker impossible", erreur);
    });
  }, []);

  return null;
}
