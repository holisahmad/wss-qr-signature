import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Treat native Node.js packages as server-external to avoid Turbopack bundling issues
  serverExternalPackages: ['@napi-rs/canvas', 'canvas', 'sharp', 'better-sqlite3', '@prisma/adapter-better-sqlite3'],
  turbopack: {
    root: __dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
