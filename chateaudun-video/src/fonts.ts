import { continueRender, delayRender, staticFile } from "remotion";

// Polices stockées dans public/fonts : le rendu marche hors ligne.
const fonts: { family: string; file: string; weight: string; style?: string }[] = [
  { family: "Playfair Display", file: "playfair-400.woff2", weight: "400" },
  { family: "Playfair Display", file: "playfair-400-italic.woff2", weight: "400", style: "italic" },
  { family: "DM Sans", file: "dmsans-400.woff2", weight: "400" },
  { family: "DM Sans", file: "dmsans-700.woff2", weight: "700" },
  { family: "JetBrains Mono", file: "jbmono-400.woff2", weight: "400" },
];

if (typeof document !== "undefined") {
  const handle = delayRender("Chargement des polices");
  Promise.all(
    fonts.map((f) => {
      const face = new FontFace(f.family, `url(${staticFile(`fonts/${f.file}`)}) format('woff2')`, {
        weight: f.weight,
        style: f.style ?? "normal",
      });
      return face.load().then((loaded) => document.fonts.add(loaded));
    }),
  )
    .then(() => continueRender(handle))
    .catch((err) => {
      console.error(err);
      continueRender(handle);
    });
}

export const SERIF = "'Playfair Display', serif";
export const SANS = "'DM Sans', sans-serif";
export const MONO = "'JetBrains Mono', monospace";
