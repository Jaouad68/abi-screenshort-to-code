import type { MetadataRoute } from "next";

/**
 * Manifeste PWA (décision d'architecture n°3 : PWA seule, pas d'application native).
 *
 * `display: standalone` retire la barre d'adresse une fois l'application ajoutée
 * à l'écran d'accueil.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Plombéo — gestion pour plombier indépendant",
    short_name: "Plombéo",
    description:
      "L'assistant tout-en-un du plombier indépendant : clients, interventions, devis et factures.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4f6f8",
    theme_color: "#0f2f44",
    lang: "fr",
    dir: "ltr",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icones/icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icones/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icones/icone-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
