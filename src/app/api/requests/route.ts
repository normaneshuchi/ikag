import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serviceRequests } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { createRequestSchema } from "@/lib/schemas";

async function getSession() {
  return await auth.api.getSession({
    headers: await headers(),
  });
}

// GET - Fetch user's service requests
export async function GET() {
  try {
    const session = await getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requests = await db.query.serviceRequests.findMany({
      where: eq(serviceRequests.userId, session.user.id),
      orderBy: [desc(serviceRequests.createdAt)],
      with: {
        serviceType: true,
        provider: {
          with: {
            user: {
              columns: {
                id: true,
                name: true,
                image: true,
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

// POST - Create a new service request (booking)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate input
    const parseResult = createRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { serviceTypeId, description, latitude, longitude, address, scheduledAt, providerId } = parseResult.data;

    // Verify provider exists and offers this service if providerId is specified
    if (providerId) {
      const providerService = await db.execute(sql`
        SELECT ps.id FROM provider_services ps
        JOIN provider_profiles pp ON pp.id = ps.provider_id
        WHERE pp.id = ${providerId}
        AND ps.service_type_id = ${serviceTypeId}
        AND pp.is_available = true
        AND pp.verified_at IS NOT NULL
      `);

      if (providerService.rows.length === 0) {
        return NextResponse.json(
          { error: "Provider does not offer this service or is not available" },
          { status: 400 }
        );
      }
    }

    // Create the request with PostGIS location
    const result = await db.execute(sql`
      INSERT INTO service_requests (
        user_id, 
        service_type_id, 
        provider_id, 
        status, 
        description, 
        location, 
        latitude, 
        longitude, 
        address, 
        scheduled_at
      )
      VALUES (
        ${session.user.id},
        ${serviceTypeId},
        ${providerId || null},
        ${providerId ? 'matched' : 'pending'},
        ${description},
        ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
        ${latitude},
        ${longitude},
        ${address || null},
        ${scheduledAt ? new Date(scheduledAt) : null}
      )
      RETURNING id, status, created_at
    `);

    const newRequest = result.rows[0] as { id: string; status: string; created_at: Date };

    return NextResponse.json({
      success: true,
      requestId: newRequest.id,
      status: newRequest.status,
      message: providerId
        ? "Your request has been sent to the provider"
        : "Your request has been created and is awaiting a provider match",
    });
  } catch (error) {
    console.error("Failed to create request:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
