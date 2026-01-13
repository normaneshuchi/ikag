import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import {
  agencies,
  agencyMembers,
  agencyServices,
  serviceTypes,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const addServiceSchema = z.object({
  serviceTypeId: z.string().uuid("Invalid service type ID"),
  hourlyRate: z.number().positive("Hourly rate must be positive").optional(),
  description: z.string().optional(),
});

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
        eq(agencyMembers.userId, userId),
        eq(agencyMembers.role, "manager")
      )
    );
  
  return !!membership;
}

// GET - List agency services
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

    const services = await db
      .select({
        id: agencyServices.id,
        serviceTypeId: agencyServices.serviceTypeId,
        hourlyRate: agencyServices.hourlyRate,
        description: agencyServices.description,
        isActive: agencyServices.isActive,
        createdAt: agencyServices.createdAt,
        serviceTypeName: serviceTypes.name,
        serviceTypeIcon: serviceTypes.icon,
        serviceTypeDescription: serviceTypes.description,
      })
      .from(agencyServices)
      .leftJoin(serviceTypes, eq(agencyServices.serviceTypeId, serviceTypes.id))
      .where(eq(agencyServices.agencyId, agencyId));

    return NextResponse.json(services);
  } catch (error) {
    console.error("Failed to fetch agency services:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Add service to agency
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
    const result = addServiceSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { serviceTypeId, hourlyRate, description } = result.data;

    // Check if service already added
    const [existing] = await db
      .select({ id: agencyServices.id })
      .from(agencyServices)
      .where(
        and(
          eq(agencyServices.agencyId, agencyId),
          eq(agencyServices.serviceTypeId, serviceTypeId)
        )
      );

    if (existing) {
      return NextResponse.json({ error: "Service already offered" }, { status: 400 });
    }

    const [service] = await db
      .insert(agencyServices)
      .values({
        agencyId,
        serviceTypeId,
        hourlyRate: hourlyRate?.toString(),
        description,
      })
      .returning();

    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    console.error("Failed to add agency service:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Remove service from agency
export async function DELETE(
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

    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get("serviceId");

    if (!serviceId) {
      return NextResponse.json({ error: "serviceId required" }, { status: 400 });
    }

    await db
      .delete(agencyServices)
      .where(
        and(
          eq(agencyServices.id, serviceId),
          eq(agencyServices.agencyId, agencyId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove agency service:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
