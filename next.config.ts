import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  reactStrictMode: true,

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
};

export default nextConfig;
