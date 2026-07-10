/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === "development";

const nextConfig = {
  reactStrictMode: true,

  experimental: {
    serverActions: {
      allowedOrigins: ["*"],
    },
  },

  async rewrites() {
    return [
      // API rewrites (production)
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

      // API rewrites (development)
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

      // ⭐ Ensure service worker is served raw
      {
        source: "/sw.js",
        destination: "/sw.js",
      },
    ];
  },

  async headers() {
    return [
      // ⭐ Service Worker must control entire site
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

      // ⭐ Manifest must be served with correct MIME type
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

      // ⭐ Icons must not be cached aggressively
      {
        source: "/icons/:path*",
        headers: [{ key: "Cache-Control", value: "no-cache" }],
      },

      // ⭐ Required for Web Push + PWA trust
      {
        source: "/.well-known/:path*",
        headers: [{ key: "Cache-Control", value: "no-cache" }],
      },
    ];
  },
};

module.exports = nextConfig;
