"use client";

import { useEffect, useState, useCallback, useRef } from "react";

interface ProviderEvent {
  type:
    | "availability_change"
    | "location_update"
    | "new_provider"
    | "provider_verified"
    | "connected";
  providerId?: string;
  payload?: unknown;
  timestamp?: number;
}

interface UseProviderStreamOptions {
  onEvent?: (event: ProviderEvent) => void;
  enabled?: boolean;
}

export function useProviderStream(options: UseProviderStreamOptions = {}) {
  const { onEvent, enabled = true } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<ProviderEvent | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectRef = useRef<(() => void) | null>(null);

  const connect = useCallback(() => {
    if (typeof window === "undefined") return;
    
    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource("/api/providers/stream");
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    // Listen for generic messages
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as ProviderEvent;
        setLastEvent(data);
        onEvent?.(data);
      } catch (e) {
        console.error("Failed to parse SSE message:", e);
      }
    };

    // Listen for named events
    eventSource.addEventListener("provider_update", (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data) as ProviderEvent;
        setLastEvent(data);
        onEvent?.(data);
      } catch (e) {
        console.error("Failed to parse provider update:", e);
      }
    });

    eventSource.onerror = () => {
      setIsConnected(false);
      setError(new Error("SSE connection failed"));

      // Close the errored connection
      eventSource.close();
      eventSourceRef.current = null;

      // Auto-reconnect after 5 seconds
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(() => {
        if (enabled) {
          connectRef.current?.();
        }
      }, 5000);
    };
  }, [enabled, onEvent]);

  // Keep the ref up to date
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      // State update happens in onclose handler or is already false
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    if (enabled) {
      connect();
    } else {
      disconnect();
      // Use timeout to avoid synchronous state update warning
      if (isMounted) {
        setTimeout(() => setIsConnected(false), 0);
      }
    }

    return () => {
      isMounted = false;
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    isConnected,
    lastEvent,
    error,
    reconnect: connect,
    disconnect,
  };
}
