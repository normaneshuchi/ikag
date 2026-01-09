import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serviceTypes } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, and, ne } from "drizzle-orm";

async function getSession() {
  return await auth.api.getSession({
    headers: await headers(),
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, icon, isActive } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Check for duplicate name (excluding current record)
    const existing = await db
      .select()
      .from(serviceTypes)
      .where(and(eq(serviceTypes.name, name), ne(serviceTypes.id, id)))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ error: "Service type already exists" }, { status: 400 });
    }

    const [updated] = await db
      .update(serviceTypes)
      .set({
        name,
        description: description || null,
        icon: icon || null,
        isActive: isActive ?? true,
        updatedAt: new Date(),
      })
      .where(eq(serviceTypes.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update service:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const [deleted] = await db
      .delete(serviceTypes)
      .where(eq(serviceTypes.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete service:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
