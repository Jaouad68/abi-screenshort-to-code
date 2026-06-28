/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // pdfkit ships .afm font metric files that must be bundled for server routes.
  experimental: {
    serverComponentsExternalPackages: ["pdfkit", "@prisma/client", "bcryptjs"],
  },
};

export default nextConfig;
