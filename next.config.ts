import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  // Precache the offline page
  additionalPrecacheEntries: [{ url: "/~offline", revision: Date.now().toString() }],
  // Service worker source file (App Router)
  swSrc: "src/app/sw.ts",
  // Output destination
  swDest: "public/sw.js",
  // Disable in development
  disable: process.env.NODE_ENV !== "production",
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
