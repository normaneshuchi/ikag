"use client";

import { QueryClient } from "@tanstack/react-query";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Cache for 24 hours (must match or exceed persister maxAge)
        gcTime: 1000 * 60 * 60 * 24,
        // Don't refetch on mount if data is fresh
        staleTime: 1000 * 60 * 5, // 5 minutes
        // Retry behavior
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        // Network mode for offline-first PWA
        networkMode: "offlineFirst",
        // Refetch settings
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        // Retry mutations when back online
        retry: 3,
        networkMode: "offlineFirst",
      },
    },
  });
}

// Singleton for server components
let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}
