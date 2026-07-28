/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === "development";

const nextConfig = {
  reactStrictMode: true,

  // ⭐ Force Turbopack to use the correct project root
  turbopack: {
    root: __dirname,
  },

  // ⭐ Keep serverActions only
  experimental: {
    serverActions: {
      allowedOrigins: ["*"],
    },
  },

  async rewrites() {
    return [
      // Production API rewrites
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

      // Development API rewrites
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

      // Service worker must be served raw
      {
        source: "/sw.js",
        destination: "/sw.js",
      },
    ];
  },

  async headers() {
    return [
      // Service Worker
      {
        source: "/sw.js",
        headers: [
          { key: "Service-Worker-Allowed", value: "/" },
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          { key: "Cache-Control", value: "no-cache" },
          { key: "X-No-Compression", value: "true" },
        ],
      },

      // Manifest
      {
        source: "/manifest.json",
        headers: [
          {
            key: "Content-Type",
            value: "application/manifest+json",
          },
          { key: "Cache-Control", value: "no-cache" },
        ],
      },

      // Icons
      {
        source: "/icons/:path*",
        headers: [{ key: "Cache-Control", value: "no-cache" }],
      },

      // Well-known
      {
        source: "/.well-known/:path*",
        headers: [{ key: "Cache-Control", value: "no-cache" }],
      },
    ];
  },
};

module.exports = nextConfig;
