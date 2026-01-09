import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serviceTypes } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const services = await db
      .select()
      .from(serviceTypes)
      .where(eq(serviceTypes.isActive, true))
      .orderBy(serviceTypes.name);

    return NextResponse.json(services);
  } catch (error) {
    console.error("Failed to fetch services:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
