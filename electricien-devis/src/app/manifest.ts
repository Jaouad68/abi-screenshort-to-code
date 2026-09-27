import type { MetadataRoute } from "next";

/** Installation sur l'écran d'accueil du téléphone (« Ajouter à l'écran d'accueil »). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Devis — Francisco MELLADO",
    short_name: "MELLADO Devis",
    description: "Devis et factures de Francisco MELLADO, électricité générale à Châteaudun.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#03224e",
    icons: [
      { src: "/marque/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/marque/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/marque/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
