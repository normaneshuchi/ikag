/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, CacheFirst, StaleWhileRevalidate } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Custom runtime caching that ensures fresh JS/CSS files
const runtimeCaching = [
  // Always fetch fresh JS and CSS files with network-first, falling back to cache
  {
    matcher: ({ request }: { request: Request }) => {
      const url = new URL(request.url);
      return (
        request.destination === "script" ||
        request.destination === "style" ||
        url.pathname.endsWith(".js") ||
        url.pathname.endsWith(".css")
      );
    },
    handler: new StaleWhileRevalidate({
      cacheName: "static-assets",
    }),
  },
  // Use default cache for other resources
  ...defaultCache,
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
