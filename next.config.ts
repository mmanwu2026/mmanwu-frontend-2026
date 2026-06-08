import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  experimental: {
    serverActions: {
      allowedOrigins: ["*"],
    },
  },

  async rewrites() {
    return [
      // Local development backend proxy
      {
        source: "/api/:path*",
        destination: "http://localhost:5000/api/:path*",
      },

      // Production backend proxy for shrine + profile fetches
      {
        source: "/api/profile/:userId",
        destination:
          "https://mmanwu-clean-production-6465.up.railway.app/profile/:userId",
      },
    ];
  },
};

export default nextConfig;
