import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "IKAG Marketplace",
    short_name: "IKAG",
    description: "Find and book local service providers for your everyday needs",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#FFD700",
    orientation: "portrait",
    categories: ["business", "lifestyle", "utilities"],
    icons: [
      {
        src: "/icons/icon-192x192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512x512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
      },
      {
        src: "/icons/icon-192x192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
      },
    ],
  };
}
