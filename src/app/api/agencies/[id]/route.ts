import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import {
  agencies,
  agencyMembers,
  agencyServices,
  agencyMemberServices,
  serviceTypes,
  users,
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { updateAgencySchema } from "@/lib/schemas/agency.schema";

// GET - Get single agency with full details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get agency with owner info
    const [agency] = await db
      .select({
        id: agencies.id,
        name: agencies.name,
        description: agencies.description,
        logo: agencies.logo,
        phone: agencies.phone,
        email: agencies.email,
        website: agencies.website,
        latitude: agencies.latitude,
        longitude: agencies.longitude,
        address: agencies.address,
        status: agencies.status,
        verifiedAt: agencies.verifiedAt,
        ownerId: agencies.ownerId,
        createdAt: agencies.createdAt,
        updatedAt: agencies.updatedAt,
        ownerName: users.name,
        ownerEmail: users.email,
      })
      .from(agencies)
      .leftJoin(users, eq(agencies.ownerId, users.id))
      .where(eq(agencies.id, id));

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 });
    }

    // Get agency members with user info
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
        // User info (for internal members)
        userName: users.name,
        userEmail: users.email,
        userImage: users.image,
      })
      .from(agencyMembers)
      .leftJoin(users, eq(agencyMembers.userId, users.id))
      .where(eq(agencyMembers.agencyId, id));

    // Get agency services
    const services = await db
      .select({
        id: agencyServices.id,
        serviceTypeId: agencyServices.serviceTypeId,
        hourlyRate: agencyServices.hourlyRate,
        description: agencyServices.description,
        isActive: agencyServices.isActive,
        serviceTypeName: serviceTypes.name,
        serviceTypeIcon: serviceTypes.icon,
      })
      .from(agencyServices)
      .leftJoin(serviceTypes, eq(agencyServices.serviceTypeId, serviceTypes.id))
      .where(eq(agencyServices.agencyId, id));

    // Get member services
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

    // Check if current user is owner or manager
    const isOwner = agency.ownerId === session.user.id;
    const isManager = members.some(
      (m) => m.userId === session.user.id && ["owner", "manager"].includes(m.role)
    );
    const canManage = isOwner || isManager || session.user.role === "admin";

    return NextResponse.json({
      ...agency,
      isVerified: !!agency.verifiedAt,
      members: members.map((m) => ({
        ...m,
        services: memberServicesMap.get(m.id) || [],
      })),
      services,
      canManage,
      isOwner,
    });
  } catch (error) {
    console.error("Failed to fetch agency:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT - Update agency
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user owns the agency or is admin
    const [agency] = await db
      .select({ ownerId: agencies.ownerId })
      .from(agencies)
      .where(eq(agencies.id, id));

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 });
    }

    if (agency.ownerId !== session.user.id && session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const result = updateAgencySchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { name, description, logo, phone, email, website, latitude, longitude, address } = result.data;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (logo !== undefined) updateData.logo = logo;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (website !== undefined) updateData.website = website;
    if (address !== undefined) updateData.address = address;
    if (latitude !== undefined) updateData.latitude = latitude.toString();
    if (longitude !== undefined) updateData.longitude = longitude.toString();

    // Update location if coordinates provided
    if (latitude !== undefined && longitude !== undefined) {
      await db
        .update(agencies)
        .set({
          ...updateData,
          location: sql`ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)`,
        })
        .where(eq(agencies.id, id));
    } else {
      await db.update(agencies).set(updateData).where(eq(agencies.id, id));
    }

    const [updated] = await db.select().from(agencies).where(eq(agencies.id, id));

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update agency:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Delete agency
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user owns the agency or is admin
    const [agency] = await db
      .select({ ownerId: agencies.ownerId })
      .from(agencies)
      .where(eq(agencies.id, id));

    if (!agency) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 });
    }

    if (agency.ownerId !== session.user.id && session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.delete(agencies).where(eq(agencies.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete agency:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
