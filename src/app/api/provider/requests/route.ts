import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serviceRequests, serviceTypes, providerProfiles, users } from "@/db/schema";
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
    
    if (!session?.user || session.user.role !== "provider") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get provider profile
    const profile = await db.query.providerProfiles.findFirst({
      where: eq(providerProfiles.userId, session.user.id),
    });

    if (!profile) {
      return NextResponse.json([]);
    }

    const requests = await db
      .select({
        id: serviceRequests.id,
        status: serviceRequests.status,
        description: serviceRequests.description,
        createdAt: serviceRequests.createdAt,
        serviceType: {
          id: serviceTypes.id,
          name: serviceTypes.name,
          icon: serviceTypes.icon,
        },
        user: {
          id: users.id,
          name: users.name,
        },
      })
      .from(serviceRequests)
      .innerJoin(serviceTypes, eq(serviceRequests.serviceTypeId, serviceTypes.id))
      .innerJoin(users, eq(serviceRequests.userId, users.id))
      .where(eq(serviceRequests.providerId, profile.id))
      .orderBy(serviceRequests.createdAt);

    return NextResponse.json(requests);
  } catch (error) {
    console.error("Failed to fetch requests:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
