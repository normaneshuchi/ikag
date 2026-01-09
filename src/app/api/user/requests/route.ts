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
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requests = await db
      .select({
        id: serviceRequests.id,
        status: serviceRequests.status,
        description: serviceRequests.description,
        createdAt: serviceRequests.createdAt,
        serviceTypeId: serviceTypes.id,
        serviceTypeName: serviceTypes.name,
        serviceTypeIcon: serviceTypes.icon,
        providerId: providerProfiles.id,
        providerUserId: users.id,
        providerName: users.name,
      })
      .from(serviceRequests)
      .innerJoin(serviceTypes, eq(serviceRequests.serviceTypeId, serviceTypes.id))
      .leftJoin(providerProfiles, eq(serviceRequests.providerId, providerProfiles.id))
      .leftJoin(users, eq(providerProfiles.userId, users.id))
      .where(eq(serviceRequests.userId, session.user.id))
      .orderBy(serviceRequests.createdAt);

    // Transform to expected format
    const formattedRequests = requests.map((r) => ({
      id: r.id,
      status: r.status,
      description: r.description,
      createdAt: r.createdAt,
      serviceType: {
        id: r.serviceTypeId,
        name: r.serviceTypeName,
        icon: r.serviceTypeIcon,
      },
      provider: r.providerId ? {
        id: r.providerId,
        user: {
          id: r.providerUserId,
          name: r.providerName,
        },
      } : null,
    }));

    return NextResponse.json(formattedRequests);
  } catch (error) {
    console.error("Failed to fetch requests:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
