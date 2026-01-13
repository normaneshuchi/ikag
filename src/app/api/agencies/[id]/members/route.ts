import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import {
  agencies,
  agencyMembers,
  agencyMemberServices,
  users,
  serviceTypes,
} from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { addAgencyMemberSchema } from "@/lib/schemas/agency.schema";

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

// GET - List agency members
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

    // Verify agency exists
    const [agency] = await db
      .select({ id: agencies.id })
      .from(agencies)
      .where(eq(agencies.id, agencyId));

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 });
    }

    // Get members with user info
    const members = await db
      .select({
        id: agencyMembers.id,
        userId: agencyMembers.userId,
        isExternal: agencyMembers.isExternal,
        externalName: agencyMembers.externalName,
        externalEmail: agencyMembers.externalEmail,
        externalPhone: agencyMembers.externalPhone,
        externalNotes: agencyMembers.externalNotes,
        role: agencyMembers.role,
        createdAt: agencyMembers.createdAt,
        userName: users.name,
        userEmail: users.email,
        userImage: users.image,
      })
      .from(agencyMembers)
      .leftJoin(users, eq(agencyMembers.userId, users.id))
      .where(eq(agencyMembers.agencyId, agencyId));

    // Get services for each member
    const memberIds = members.map((m) => m.id);
    const memberServicesMap = new Map<string, { serviceTypeId: string; serviceTypeName: string; hourlyRate: string | null }[]>();

    if (memberIds.length > 0) {
      const memberServices = await db
        .select({
          agencyMemberId: agencyMemberServices.agencyMemberId,
          serviceTypeId: agencyMemberServices.serviceTypeId,
          hourlyRate: agencyMemberServices.hourlyRate,
          serviceTypeName: serviceTypes.name,
        })
        .from(agencyMemberServices)
        .leftJoin(serviceTypes, eq(agencyMemberServices.serviceTypeId, serviceTypes.id))
        .where(sql`${agencyMemberServices.agencyMemberId} = ANY(${memberIds})`);

      for (const ms of memberServices) {
        if (!memberServicesMap.has(ms.agencyMemberId)) {
          memberServicesMap.set(ms.agencyMemberId, []);
        }
        memberServicesMap.get(ms.agencyMemberId)!.push({
          serviceTypeId: ms.serviceTypeId,
          serviceTypeName: ms.serviceTypeName || "",
          hourlyRate: ms.hourlyRate,
        });
      }
    }

    return NextResponse.json(
      members.map((m) => ({
        ...m,
        services: memberServicesMap.get(m.id) || [],
      }))
    );
  } catch (error) {
    console.error("Failed to fetch agency members:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Add member to agency
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

    // Check permissions
    const canManage = await canManageAgency(agencyId, session.user.id, session.user.role || "user");
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const result = addAgencyMemberSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { providerId, isExternal, externalName, externalEmail, externalPhone, externalNotes, role } = result.data;

    // For internal members, verify user exists
    if (!isExternal && providerId) {
      const [user] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, providerId));

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      // Check if already a member
      const [existing] = await db
        .select({ id: agencyMembers.id })
        .from(agencyMembers)
        .where(
          and(
            eq(agencyMembers.agencyId, agencyId),
            eq(agencyMembers.userId, providerId)
          )
        );

      if (existing) {
        return NextResponse.json({ error: "User is already a member" }, { status: 400 });
      }
    }

    // Create member
    const [member] = await db
      .insert(agencyMembers)
      .values({
        agencyId,
        userId: isExternal ? null : providerId,
        isExternal,
        externalName: isExternal ? externalName : null,
        externalEmail: isExternal ? externalEmail : null,
        externalPhone: isExternal ? externalPhone : null,
        externalNotes: isExternal ? externalNotes : null,
        role,
      })
      .returning();

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error("Failed to add agency member:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
