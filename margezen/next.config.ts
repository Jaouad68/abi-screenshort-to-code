import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
