import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Ensures Next.js App Router API routes register correctly
  experimental: {
    serverActions: {
      allowedOrigins: ["*"],
    },
  },

  // If your backend runs on Railway or localhost, this helps during development
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:5000/api/:path*", // local dev backend
      },
    ];
  },
};

export default nextConfig;
