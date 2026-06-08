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
      // ✅ Production rewrite (must come FIRST)
      {
        source: "/api/profile/:userId",
        destination:
          "https://mmanwu-clean-production-6465.up.railway.app/profile/:userId",
      },

      // ✅ Development-only rewrite (localhost)
      ...(isDev
        ? [
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
