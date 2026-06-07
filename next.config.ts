import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // ⭐ REQUIRED: Enable App Router so /app/plaza/page.tsx works
  experimental: {
    appDir: true,
    serverActions: {
      allowedOrigins: ["*"],
    },
  },

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
