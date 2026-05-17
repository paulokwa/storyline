import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1', '192.168.4.120'],
  images: {
    qualities: [100, 75],
  },
  outputFileTracingIncludes: {
    '/api/import': ['./node_modules/@napi-rs/canvas*/**/*'],
  },
}

export default nextConfig;
