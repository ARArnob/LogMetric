import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow standalone for easier deployment
  // @ts-ignore - allowedDevOrigins might not be in the types yet but is required for local network dev
  allowedDevOrigins: ['logmetric.tech', '192.168.1.102'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8081/api/:path*', // Proxy to Backend
      },
    ];
  },
};

export default nextConfig;
