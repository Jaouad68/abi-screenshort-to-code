import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Next.js 16 : Turbopack est actif par défaut, aucune option à déclarer ici.

  // Ce dépôt héberge plusieurs applications, chacune avec son propre
  // package-lock.json. Sans cette précision, Next.js remonte au dépôt parent
  // pour déterminer la racine et émet un avertissement à chaque démarrage.
  outputFileTracingRoot: path.resolve(import.meta.dirname),
};

export default nextConfig;
