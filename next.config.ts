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
};

export default withPWA(nextConfig);
