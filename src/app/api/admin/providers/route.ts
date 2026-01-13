import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { providerProfiles, users, providerServices, serviceTypes } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, like, desc } from "drizzle-orm";

async function getSession() {
  return await auth.api.getSession({
    headers: await headers(),
  });
}

// GET - List all providers (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const serviceTypeId = searchParams.get("serviceTypeId");
    const verifiedOnly = searchParams.get("verifiedOnly") === "true";

    // Get all providers with user info
    const providers = await db
      .select({
        id: providerProfiles.id,
        userId: providerProfiles.userId,
        bio: providerProfiles.bio,
        isAvailable: providerProfiles.isAvailable,
        verifiedAt: providerProfiles.verifiedAt,
        averageRating: providerProfiles.averageRating,
        totalReviews: providerProfiles.totalReviews,
        userName: users.name,
        userEmail: users.email,
        userImage: users.image,
      })
      .from(providerProfiles)
      .innerJoin(users, eq(providerProfiles.userId, users.id))
      .where(
        search 
          ? like(users.name, `%${search}%`)
          : undefined
      )
      .orderBy(desc(providerProfiles.createdAt));

    // Filter verified if needed
    let filteredProviders = providers;
    if (verifiedOnly) {
      filteredProviders = providers.filter(p => p.verifiedAt);
    }

    // Get services for each provider
    const providersWithServices = await Promise.all(
      filteredProviders.map(async (provider) => {
        const services = await db
          .select({
            id: providerServices.id,
            serviceTypeId: providerServices.serviceTypeId,
            serviceName: serviceTypes.name,
            serviceIcon: serviceTypes.icon,
            hourlyRate: providerServices.hourlyRate,
          })
          .from(providerServices)
          .innerJoin(serviceTypes, eq(providerServices.serviceTypeId, serviceTypes.id))
          .where(eq(providerServices.providerId, provider.id));

        return {
          ...provider,
          services,
        };
      })
    );

    // Filter by service type if specified
    let result = providersWithServices;
    if (serviceTypeId) {
      result = providersWithServices.filter(p => 
        p.services.some(s => s.serviceTypeId === serviceTypeId)
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch providers:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
