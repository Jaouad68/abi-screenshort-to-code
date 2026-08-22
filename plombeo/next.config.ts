import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Next.js 16 : Turbopack est actif par défaut, aucune option à déclarer ici.

  // Ce dépôt héberge plusieurs applications, chacune avec son propre
  // package-lock.json. Sans cette précision, Next.js remonte au dépôt parent
  // pour déterminer la racine et émet un avertissement à chaque démarrage.
  outputFileTracingRoot: path.resolve(import.meta.dirname),

  // pdfkit lit ses métriques de police (`.afm`) sur le DISQUE, à un chemin
  // calculé au moment de l'exécution. Empaqueté, ce chemin est réécrit et la
  // génération échoue par `ENOENT` — au moment d'envoyer une facture, c'est-à-dire
  // au pire moment. Le laisser hors du paquet le fait charger normalement depuis
  // node_modules.
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
