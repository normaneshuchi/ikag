import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serviceTypes } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";

async function getSession() {
  return await auth.api.getSession({
    headers: await headers(),
  });
}

export async function GET() {
  try {
    const session = await getSession();
    
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const services = await db.select().from(serviceTypes).orderBy(serviceTypes.name);
    
    return NextResponse.json(services);
  } catch (error) {
    console.error("Failed to fetch services:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, icon, isActive } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Check for duplicate name
    const existing = await db
      .select()
      .from(serviceTypes)
      .where(eq(serviceTypes.name, name))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ error: "Service type already exists" }, { status: 400 });
    }

    const [newService] = await db
      .insert(serviceTypes)
      .values({
        name,
        description: description || null,
        icon: icon || null,
        isActive: isActive ?? true,
      })
      .returning();

    return NextResponse.json(newService, { status: 201 });
  } catch (error) {
    console.error("Failed to create service:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
