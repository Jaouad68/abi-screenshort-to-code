import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cours ou Pas ? 95",
    short_name: "Cours ou Pas",
    description: "Grèves et blocages dans les lycées du Val d'Oise, en temps réel.",
    lang: "fr",
    start_url: "/",
    display: "standalone",
    background_color: "#f2f2f7",
    theme_color: "#5e5ce6",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
