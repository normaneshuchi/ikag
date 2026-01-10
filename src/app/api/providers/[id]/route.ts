import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { providerProfiles, users, providerServices, serviceTypes, serviceRequests } from "@/db/schema";
import { eq, and, count, or } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get provider profile with user info
    const provider = await db
      .select({
        id: providerProfiles.id,
        userId: providerProfiles.userId,
        bio: providerProfiles.bio,
        yearsOfExperience: providerProfiles.yearsOfExperience,
        address: providerProfiles.address,
        serviceRadius: providerProfiles.serviceRadius,
        isAvailable: providerProfiles.isAvailable,
        averageRating: providerProfiles.averageRating,
        totalReviews: providerProfiles.totalReviews,
        verifiedAt: providerProfiles.verifiedAt,
        createdAt: providerProfiles.createdAt,
        userName: users.name,
        userImage: users.image,
      })
      .from(providerProfiles)
      .innerJoin(users, eq(providerProfiles.userId, users.id))
      .where(eq(providerProfiles.id, id))
      .limit(1);

    if (provider.length === 0) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    // Get provider's services
    const services = await db
      .select({
        id: providerServices.id,
        serviceTypeId: providerServices.serviceTypeId,
        hourlyRate: providerServices.hourlyRate,
        description: providerServices.description,
        serviceName: serviceTypes.name,
        serviceIcon: serviceTypes.icon,
      })
      .from(providerServices)
      .innerJoin(serviceTypes, eq(providerServices.serviceTypeId, serviceTypes.id))
      .where(eq(providerServices.providerId, id));

    // Get completed + cancelled jobs count
    const jobsResult = await db
      .select({ count: count() })
      .from(serviceRequests)
      .where(
        and(
          eq(serviceRequests.providerId, id),
          or(
            eq(serviceRequests.status, "completed"),
            eq(serviceRequests.status, "cancelled")
          )
        )
      );

    const completedJobs = jobsResult[0]?.count ?? 0;

    return NextResponse.json({
      ...provider[0],
      services,
      completedJobs,
    });
  } catch (error) {
    console.error("Error fetching provider:", error);
    return NextResponse.json(
      { error: "Failed to fetch provider" },
      { status: 500 }
    );
  }
}
