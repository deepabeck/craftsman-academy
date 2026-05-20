import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default is 1MB which is too small for profile photo uploads.
      // Phone photos are typically 2–8MB.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
