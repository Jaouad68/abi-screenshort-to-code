import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ce projet vit dans un sous-dossier du dépôt : on fixe explicitement la
  // racine pour éviter que Next.js ne remonte au lockfile parent.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
