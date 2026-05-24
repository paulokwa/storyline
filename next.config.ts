import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1', '192.168.4.120'],
  images: {
    qualities: [100, 75],
  },
  outputFileTracingIncludes: {
    // pdf-parse uses a runtime template-string require for its bundled pdf.js, which NFT
    // cannot statically trace — include the whole lib so it's present in the Lambda bundle
    '/api/import': ['./node_modules/pdf-parse/lib/**/*'],
  },
}

export default nextConfig;
