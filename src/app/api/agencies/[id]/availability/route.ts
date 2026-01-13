import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import {
  agencyMembers,
  agencyMemberServices,
  providerBookings,
  users,
} from "@/db/schema";
import { eq, and, sql, not } from "drizzle-orm";
import { z } from "zod";

const checkAvailabilitySchema = z.object({
  serviceTypeId: z.string().uuid("Invalid service type ID"),
  startTime: z.string().datetime("Invalid start time"),
  endTime: z.string().datetime("Invalid end time"),
  excludeRequestId: z.string().uuid("Invalid request ID").optional(),
});

// GET - Check availability for a service at a specific time
// Returns available members who can perform the service and don't have conflicting bookings
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
    const serviceTypeId = searchParams.get("serviceTypeId");
    const startTime = searchParams.get("startTime");
    const endTime = searchParams.get("endTime");
    const excludeRequestId = searchParams.get("excludeRequestId");

    const result = checkAvailabilitySchema.safeParse({
      serviceTypeId,
      startTime,
      endTime,
      excludeRequestId,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const startDate = new Date(result.data.startTime);
    const endDate = new Date(result.data.endTime);

    // First, get all members who offer this service
    const membersWithService = await db
      .select({
        memberId: agencyMembers.id,
        userId: agencyMembers.userId,
        isExternal: agencyMembers.isExternal,
        externalName: agencyMembers.externalName,
        externalEmail: agencyMembers.externalEmail,
        externalPhone: agencyMembers.externalPhone,
        role: agencyMembers.role,
        hourlyRate: agencyMemberServices.hourlyRate,
        // User info for internal members
        userName: users.name,
        userImage: users.image,
      })
      .from(agencyMembers)
      .innerJoin(
        agencyMemberServices,
        eq(agencyMemberServices.agencyMemberId, agencyMembers.id)
      )
      .leftJoin(users, eq(agencyMembers.userId, users.id))
      .where(
        and(
          eq(agencyMembers.agencyId, agencyId),
          eq(agencyMemberServices.serviceTypeId, serviceTypeId!)
        )
      );

    if (membersWithService.length === 0) {
      return NextResponse.json({
        available: [],
        unavailable: [],
        hasAvailability: false,
        message: "No members offer this service",
      });
    }

    const memberIds = membersWithService.map((m) => m.memberId);

    // Find members with conflicting bookings (overlapping time slots)
    // Booking conflicts: booking.startTime < requestedEnd AND booking.endTime > requestedStart
    const conflictConditions = [
      sql`${providerBookings.agencyMemberId} = ANY(${memberIds})`,
      sql`${providerBookings.startTime} < ${endDate}`,
      sql`${providerBookings.endTime} > ${startDate}`,
      not(eq(providerBookings.status, "cancelled")),
    ];

    // Exclude a specific request (useful when rescheduling)
    if (excludeRequestId) {
      conflictConditions.push(not(eq(providerBookings.requestId, excludeRequestId)));
    }

    const conflictingBookings = await db
      .select({
        agencyMemberId: providerBookings.agencyMemberId,
      })
      .from(providerBookings)
      .where(and(...conflictConditions));

    const busyMemberIds = new Set(conflictingBookings.map((b) => b.agencyMemberId));

    // Separate available and unavailable members
    const available = membersWithService
      .filter((m) => !busyMemberIds.has(m.memberId))
      .map((m) => ({
        id: m.memberId,
        name: m.isExternal ? m.externalName : m.userName,
        isExternal: m.isExternal,
        image: m.userImage,
        hourlyRate: m.hourlyRate,
        role: m.role,
      }));

    const unavailable = membersWithService
      .filter((m) => busyMemberIds.has(m.memberId))
      .map((m) => ({
        id: m.memberId,
        name: m.isExternal ? m.externalName : m.userName,
        isExternal: m.isExternal,
        reason: "Has conflicting booking",
      }));

    return NextResponse.json({
      available,
      unavailable,
      hasAvailability: available.length > 0,
      totalMembers: membersWithService.length,
      availableCount: available.length,
    });
  } catch (error) {
    console.error("Failed to check availability:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create a booking (reserve a time slot for a member)
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

    const body = await request.json();
    const { agencyMemberId, requestId, serviceTypeId, startTime, estimatedDuration } = body;

    if (!agencyMemberId || !requestId || !serviceTypeId || !startTime || !estimatedDuration) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify member belongs to this agency
    const [member] = await db
      .select({ id: agencyMembers.id })
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

    // Calculate end time
    const startDate = new Date(startTime);
    const endDate = new Date(startDate.getTime() + estimatedDuration * 60 * 1000);

    // Check for conflicts one more time (race condition prevention)
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
      return NextResponse.json({ error: "Time slot no longer available" }, { status: 409 });
    }

    // Create booking
    const [booking] = await db
      .insert(providerBookings)
      .values({
        agencyMemberId,
        requestId,
        serviceTypeId,
        startTime: startDate,
        endTime: endDate,
        estimatedDuration,
        status: "scheduled",
      })
      .returning();

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    console.error("Failed to create booking:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
