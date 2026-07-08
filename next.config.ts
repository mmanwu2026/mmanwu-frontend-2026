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

      // ⭐ REQUIRED: ensure /sw.js is served raw and not intercepted by Next.js
      {
        source: "/sw.js",
        destination: "/sw.js",
      },
    ];
  },

  async headers() {
    return [
      // ⭐ REQUIRED: allow service worker to control the entire site
      {
        source: "/sw.js",
        headers: [
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
          {
            key: "Cache-Control",
            value: "no-store",
          },
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
