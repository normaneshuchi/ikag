import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serviceRequests } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { desc } from "drizzle-orm";

async function getSession() {
  return await auth.api.getSession({
    headers: await headers(),
  });
}

// GET - List all requests (admin only)
export async function GET() {
  try {
    const session = await getSession();

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use the query builder with relations
    const requests = await db.query.serviceRequests.findMany({
      orderBy: [desc(serviceRequests.createdAt)],
      with: {
        serviceType: {
          columns: {
            id: true,
            name: true,
            icon: true,
          },
        },
        user: {
          columns: {
            id: true,
            name: true,
          },
        },
        provider: {
          with: {
            user: {
              columns: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error("Failed to fetch requests:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
