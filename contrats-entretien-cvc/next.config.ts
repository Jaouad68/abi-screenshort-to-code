import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ce projet vit dans un sous-dossier du dépôt : on fixe explicitement la
  // racine pour éviter que Next.js ne remonte au lockfile parent.
  turbopack: {
    root: __dirname,
  },
  experimental: {
    serverActions: {
      // Les photos d'intervention sont compressées côté client puis envoyées
      // en base64 via une Server Action (voir PhotoUpload.tsx) ; on relève
      // la limite par défaut (1 Mo) en conséquence.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
