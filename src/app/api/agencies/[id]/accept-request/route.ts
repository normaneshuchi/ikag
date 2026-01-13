import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import {
  agencies,
  agencyMembers,
  serviceRequests,
  providerBookings,
} from "@/db/schema";
import { eq, and, sql, not } from "drizzle-orm";
import { acceptRequestSchema } from "@/lib/schemas/agency.schema";

// Helper to check if user can manage agency
async function canManageAgency(agencyId: string, userId: string, userRole: string): Promise<boolean> {
  if (userRole === "admin") return true;
  
  const [agency] = await db
    .select({ ownerId: agencies.ownerId })
    .from(agencies)
    .where(eq(agencies.id, agencyId));
  
  if (!agency) return false;
  if (agency.ownerId === userId) return true;
  
  const [membership] = await db
    .select({ role: agencyMembers.role })
    .from(agencyMembers)
    .where(
      and(
        eq(agencyMembers.agencyId, agencyId),
        eq(agencyMembers.userId, userId)
      )
    );
  
  return !!membership && ["owner", "manager"].includes(membership.role);
}

// POST - Accept a service request and assign to a member
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: agencyId } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canManage = await canManageAgency(agencyId, session.user.id, session.user.role || "user");
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const result = acceptRequestSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { requestId, agencyMemberId, estimatedDuration, scheduledAt } = result.data;

    // Verify request exists and is in a valid state
    const [serviceRequest] = await db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.id, requestId));

    if (!serviceRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (!["pending", "matched"].includes(serviceRequest.status)) {
      return NextResponse.json(
        { error: `Cannot accept request with status: ${serviceRequest.status}` },
        { status: 400 }
      );
    }

    // Verify member belongs to this agency
    const [member] = await db
      .select()
      .from(agencyMembers)
      .where(
        and(
          eq(agencyMembers.id, agencyMemberId),
          eq(agencyMembers.agencyId, agencyId)
        )
      );

    if (!member) {
      return NextResponse.json({ error: "Member not found in agency" }, { status: 404 });
    }

    // Calculate times
    const startDate = new Date(scheduledAt);
    const endDate = new Date(startDate.getTime() + estimatedDuration * 60 * 1000);

    // Check for booking conflicts
    const [conflict] = await db
      .select({ id: providerBookings.id })
      .from(providerBookings)
      .where(
        and(
          eq(providerBookings.agencyMemberId, agencyMemberId),
          sql`${providerBookings.startTime} < ${endDate}`,
          sql`${providerBookings.endTime} > ${startDate}`,
          not(eq(providerBookings.status, "cancelled"))
        )
      );

    if (conflict) {
      return NextResponse.json(
        { error: "Member has a conflicting booking at this time" },
        { status: 409 }
      );
    }

    // Begin transaction-like operations
    // 1. Update the service request
    await db
      .update(serviceRequests)
      .set({
        agencyId,
        agencyMemberId,
        estimatedDuration,
        scheduledAt: startDate,
        estimatedEndTime: endDate,
        status: "accepted",
        updatedAt: new Date(),
      })
      .where(eq(serviceRequests.id, requestId));

    // 2. Create the booking
    const [booking] = await db
      .insert(providerBookings)
      .values({
        agencyMemberId,
        requestId,
        serviceTypeId: serviceRequest.serviceTypeId,
        startTime: startDate,
        endTime: endDate,
        estimatedDuration,
        status: "scheduled",
      })
      .returning();

    // Fetch updated request
    const [updatedRequest] = await db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.id, requestId));

    return NextResponse.json({
      request: updatedRequest,
      booking,
      message: "Request accepted and booking created",
    });
  } catch (error) {
    console.error("Failed to accept request:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
