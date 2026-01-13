import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import {
  agencyMembers,
  providerBookings,
  serviceRequests,
  serviceTypes,
  users,
} from "@/db/schema";
import { eq, and, sql, gte, lte } from "drizzle-orm";

// GET - List bookings for an agency (calendar view)
export async function GET(
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

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");
    const serviceTypeId = searchParams.get("serviceTypeId");
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Get all members of this agency
    const agencyMemberIds = await db
      .select({ id: agencyMembers.id })
      .from(agencyMembers)
      .where(eq(agencyMembers.agencyId, agencyId));

    if (agencyMemberIds.length === 0) {
      return NextResponse.json([]);
    }

    const memberIds = agencyMemberIds.map((m) => m.id);

    // Build query
    const conditions = [sql`${providerBookings.agencyMemberId} = ANY(${memberIds})`];

    if (memberId) {
      conditions.push(eq(providerBookings.agencyMemberId, memberId));
    }

    if (serviceTypeId) {
      conditions.push(eq(providerBookings.serviceTypeId, serviceTypeId));
    }

    if (status) {
      conditions.push(eq(providerBookings.status, status as "scheduled" | "in_progress" | "completed" | "cancelled"));
    }

    if (startDate) {
      conditions.push(gte(providerBookings.startTime, new Date(startDate)));
    }

    if (endDate) {
      conditions.push(lte(providerBookings.endTime, new Date(endDate)));
    }

    const bookings = await db
      .select({
        id: providerBookings.id,
        agencyMemberId: providerBookings.agencyMemberId,
        requestId: providerBookings.requestId,
        serviceTypeId: providerBookings.serviceTypeId,
        startTime: providerBookings.startTime,
        endTime: providerBookings.endTime,
        estimatedDuration: providerBookings.estimatedDuration,
        status: providerBookings.status,
        createdAt: providerBookings.createdAt,
        // Member info
        memberIsExternal: agencyMembers.isExternal,
        memberExternalName: agencyMembers.externalName,
        memberName: users.name,
        memberImage: users.image,
        // Service info
        serviceTypeName: serviceTypes.name,
        serviceTypeIcon: serviceTypes.icon,
        // Request info
        requestDescription: serviceRequests.description,
        requestAddress: serviceRequests.address,
        requestStatus: serviceRequests.status,
      })
      .from(providerBookings)
      .leftJoin(agencyMembers, eq(providerBookings.agencyMemberId, agencyMembers.id))
      .leftJoin(users, eq(agencyMembers.userId, users.id))
      .leftJoin(serviceTypes, eq(providerBookings.serviceTypeId, serviceTypes.id))
      .leftJoin(serviceRequests, eq(providerBookings.requestId, serviceRequests.id))
      .where(and(...conditions))
      .orderBy(providerBookings.startTime);

    // Transform for calendar-friendly format
    const calendarBookings = bookings.map((b) => ({
      id: b.id,
      title: b.serviceTypeName || "Service",
      start: b.startTime,
      end: b.endTime,
      status: b.status,
      member: {
        id: b.agencyMemberId,
        name: b.memberIsExternal ? b.memberExternalName : b.memberName,
        isExternal: b.memberIsExternal,
        image: b.memberImage,
      },
      service: {
        id: b.serviceTypeId,
        name: b.serviceTypeName,
        icon: b.serviceTypeIcon,
      },
      request: {
        id: b.requestId,
        description: b.requestDescription,
        address: b.requestAddress,
        status: b.requestStatus,
      },
      estimatedDuration: b.estimatedDuration,
    }));

    return NextResponse.json(calendarBookings);
  } catch (error) {
    console.error("Failed to fetch bookings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH - Update booking status
export async function PATCH(
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

    const body = await request.json();
    const { bookingId, status } = body;

    if (!bookingId || !status) {
      return NextResponse.json({ error: "bookingId and status required" }, { status: 400 });
    }

    // Verify booking belongs to a member of this agency
    const [booking] = await db
      .select({
        id: providerBookings.id,
        agencyMemberId: providerBookings.agencyMemberId,
        requestId: providerBookings.requestId,
      })
      .from(providerBookings)
      .innerJoin(agencyMembers, eq(providerBookings.agencyMemberId, agencyMembers.id))
      .where(
        and(
          eq(providerBookings.id, bookingId),
          eq(agencyMembers.agencyId, agencyId)
        )
      );

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Update booking status
    await db
      .update(providerBookings)
      .set({ status, updatedAt: new Date() })
      .where(eq(providerBookings.id, bookingId));

    // Update corresponding request status if needed
    if (status === "in_progress") {
      await db
        .update(serviceRequests)
        .set({ status: "in_progress", updatedAt: new Date() })
        .where(eq(serviceRequests.id, booking.requestId));
    } else if (status === "completed") {
      await db
        .update(serviceRequests)
        .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
        .where(eq(serviceRequests.id, booking.requestId));
    } else if (status === "cancelled") {
      await db
        .update(serviceRequests)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(serviceRequests.id, booking.requestId));
    }

    const [updated] = await db
      .select()
      .from(providerBookings)
      .where(eq(providerBookings.id, bookingId));

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update booking:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
