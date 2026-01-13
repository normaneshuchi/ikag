import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import {
  agencies,
  agencyMembers,
  agencyMemberServices,
  serviceTypes,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { addMemberServiceSchema } from "@/lib/schemas/agency.schema";

// Helper to check if user can manage agency
async function canManageAgency(agencyId: string, userId: string, userRole: string): Promise<boolean> {
  if (userRole === "admin") return true;
  
  const [agency] = await db
    .select({ ownerId: agencies.ownerId })
    .from(agencies)
    .where(eq(agencies.id, agencyId));
  
  if (!agency) return false;
  if (agency.ownerId === userId) return true;
  
  // Check if user is a manager
  const [membership] = await db
    .select({ role: agencyMembers.role })
    .from(agencyMembers)
    .where(
      and(
        eq(agencyMembers.agencyId, agencyId),
        eq(agencyMembers.userId, userId),
        eq(agencyMembers.role, "manager")
      )
    );
  
  return !!membership;
}

// GET - Get member details with services
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id: agencyId, memberId } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [member] = await db
      .select()
      .from(agencyMembers)
      .where(
        and(
          eq(agencyMembers.id, memberId),
          eq(agencyMembers.agencyId, agencyId)
        )
      );

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Get member services
    const services = await db
      .select({
        id: agencyMemberServices.id,
        serviceTypeId: agencyMemberServices.serviceTypeId,
        hourlyRate: agencyMemberServices.hourlyRate,
        serviceTypeName: serviceTypes.name,
        serviceTypeIcon: serviceTypes.icon,
      })
      .from(agencyMemberServices)
      .leftJoin(serviceTypes, eq(agencyMemberServices.serviceTypeId, serviceTypes.id))
      .where(eq(agencyMemberServices.agencyMemberId, memberId));

    return NextResponse.json({
      ...member,
      services,
    });
  } catch (error) {
    console.error("Failed to fetch member:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT - Update member (role, external info)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id: agencyId, memberId } = await params;

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
    const { role, externalName, externalEmail, externalPhone, externalNotes } = body;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (role) updateData.role = role;
    if (externalName !== undefined) updateData.externalName = externalName;
    if (externalEmail !== undefined) updateData.externalEmail = externalEmail;
    if (externalPhone !== undefined) updateData.externalPhone = externalPhone;
    if (externalNotes !== undefined) updateData.externalNotes = externalNotes;

    await db
      .update(agencyMembers)
      .set(updateData)
      .where(
        and(
          eq(agencyMembers.id, memberId),
          eq(agencyMembers.agencyId, agencyId)
        )
      );

    const [updated] = await db
      .select()
      .from(agencyMembers)
      .where(eq(agencyMembers.id, memberId));

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update member:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Remove member from agency
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id: agencyId, memberId } = await params;

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

    // Prevent removing owner
    const [member] = await db
      .select({ role: agencyMembers.role })
      .from(agencyMembers)
      .where(eq(agencyMembers.id, memberId));

    if (member?.role === "owner") {
      return NextResponse.json({ error: "Cannot remove agency owner" }, { status: 400 });
    }

    await db
      .delete(agencyMembers)
      .where(
        and(
          eq(agencyMembers.id, memberId),
          eq(agencyMembers.agencyId, agencyId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove member:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Add service to member
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id: agencyId, memberId } = await params;

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
    const result = addMemberServiceSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { serviceTypeId, hourlyRate } = result.data;

    // Check if service already added
    const [existing] = await db
      .select({ id: agencyMemberServices.id })
      .from(agencyMemberServices)
      .where(
        and(
          eq(agencyMemberServices.agencyMemberId, memberId),
          eq(agencyMemberServices.serviceTypeId, serviceTypeId)
        )
      );

    if (existing) {
      return NextResponse.json({ error: "Service already added" }, { status: 400 });
    }

    const [service] = await db
      .insert(agencyMemberServices)
      .values({
        agencyMemberId: memberId,
        serviceTypeId,
        hourlyRate: hourlyRate?.toString(),
      })
      .returning();

    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    console.error("Failed to add member service:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
