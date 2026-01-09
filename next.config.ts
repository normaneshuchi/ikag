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
  // Opt out of Tailwind since we're using Mantine
  // But keep it for potential utility classes
  experimental: {
    optimizePackageImports: ["@mantine/core", "@mantine/hooks", "@tabler/icons-react"],
  },
  // Enable Turbopack for Next.js 16
  turbopack: {},
};

export default withSerwist(nextConfig);
