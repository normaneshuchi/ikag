import { NextRequest } from "next/server";

// Store for active connections (in production, use Redis pub/sub)
const clients = new Set<ReadableStreamDefaultController>();

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      clients.add(controller);

      // Send initial connection event
      const data = `data: ${JSON.stringify({ type: "connected", timestamp: Date.now() })}\n\n`;
      controller.enqueue(encoder.encode(data));

      // Keep-alive: send ping every 30 seconds
      const keepAliveInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          clearInterval(keepAliveInterval);
        }
      }, 30000);

      // Clean up on connection close
      request.signal.addEventListener("abort", () => {
        clients.delete(controller);
        clearInterval(keepAliveInterval);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
    cancel() {
      // Handle client disconnect
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  });
}

// Helper to broadcast events to all connected clients
export function broadcastProviderUpdate(data: {
  type: "availability_change" | "location_update" | "new_provider" | "provider_verified";
  providerId: string;
  payload?: unknown;
}) {
  const encoder = new TextEncoder();
  const message = `event: provider_update\ndata: ${JSON.stringify(data)}\n\n`;

  clients.forEach((controller) => {
    try {
      controller.enqueue(encoder.encode(message));
    } catch {
      clients.delete(controller);
    }
  });
}

// Export for use in other API routes
export const sseClients = {
  broadcast: broadcastProviderUpdate,
  count: () => clients.size,
};
