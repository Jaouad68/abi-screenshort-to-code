import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Le dépôt parent contient un autre projet : on fixe la racine de celui-ci.
  turbopack: { root: __dirname },
};

export default nextConfig;
