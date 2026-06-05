import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // ⭐ Enable the App Router
  experimental: {
    appDir: true,
    serverActions: {
      allowedOrigins: ["*"],
    },
  },

  // ⭐ Local dev backend proxy (ignored in production)
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:5000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
