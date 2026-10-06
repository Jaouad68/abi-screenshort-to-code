import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dar Tanja",
    short_name: "Dar Tanja",
    description: "Appartements neufs à Tanger : titre foncier vérifié et aide de l'État calculée.",
    lang: "fr",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f6f8",
    theme_color: "#0b4f6c",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
