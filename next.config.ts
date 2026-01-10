import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

// Generate a unique revision for each build
const buildId = process.env.NEXT_PUBLIC_BUILD_ID || Date.now().toString();

// Disable PWA in development or on localhost
const isLocalhost = process.env.NEXT_PUBLIC_APP_URL?.includes("localhost");
const disablePWA = process.env.NODE_ENV !== "production" || isLocalhost;

const withSerwist = withSerwistInit({
  // Precache the offline page with build-specific revision
  additionalPrecacheEntries: [{ url: "/~offline", revision: buildId }],
  // Service worker source file (App Router)
  swSrc: "src/app/sw.ts",
  // Output destination
  swDest: "public/sw.js",
  // Disable in development or on localhost
  disable: disablePWA,
  // Force service worker to update immediately
  reloadOnOnline: true,
});

const nextConfig: NextConfig = {
  // Performance optimizations
  experimental: {
    optimizePackageImports: ["@mantine/core", "@mantine/hooks", "@tabler/icons-react"],
  },
  
  // Enable React Compiler for automatic memoization (Next.js 16+)
  reactCompiler: true,
  
  // Production optimizations
  poweredByHeader: false,
  compress: true,
  
  // Image optimization
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },
  
  // Logging for debugging
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === "development",
    },
  },
  
  // Empty turbopack config to silence the webpack/turbopack mismatch error
  // Serwist adds webpack config, but we can tell Next.js we acknowledge this
  turbopack: {},
  
  // Use webpack for production builds (required for @serwist/next PWA support)
  // Turbopack doesn't support serwist yet
  webpack: (config) => config,
};

export default withSerwist(nextConfig);
