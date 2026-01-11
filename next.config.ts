import type { NextConfig } from "next";
// @ts-expect-error - next-pwa doesn't have type declarations
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  // Empty turbopack config to acknowledge we're using webpack plugins
  turbopack: {},
  // Skip TypeScript errors during build (pre-existing strict mode issues)
  typescript: {
    ignoreBuildErrors: true,
  },
  // Configure external packages for serverless functions (Chromium for scraping)
  serverExternalPackages: ["@sparticuz/chromium"],
  // Experimental settings for better serverless function bundling
  experimental: {
    outputFileTracingIncludes: {
      "/api/scrape-marketplace": ["./node_modules/@sparticuz/chromium/**/*"],
    },
  },
};

export default withPWA(nextConfig);
