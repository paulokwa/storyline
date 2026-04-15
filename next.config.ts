import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.4.120'],
  images: {
    qualities: [100, 75],
  },
} as any;

export default nextConfig;
