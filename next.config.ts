import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // ⭐ CRITICAL FIX — forces Vercel to generate a fresh build output
  // This breaks the CDN-level service worker deadlock.
  distDir: "build",

  experimental: {
    serverActions: {
      allowedOrigins: ["*"],
    },
  },

  async rewrites() {
    return [
      {
        source: "/api/profile/:userId",
        destination:
          "https://mmanwu-clean-production-6465.up.railway.app/profile/:userId",
      },
      {
        source: "/api/:path*",
        destination:
          "https://mmanwu-clean-production-6465.up.railway.app/api/:path*",
      },

      ...(isDev
        ? [
            {
              source: "/api/profile/:userId",
              destination: "http://localhost:5000/profile/:userId",
            },
            {
              source: "/api/:path*",
              destination: "http://localhost:5000/api/:path*",
            },
          ]
        : []),
    ];
  },

  // ⭐ Leave this — but it no longer matters since SW is disabled
  async headers() {
    return [
      {
        source: "/sw-v2.js",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
