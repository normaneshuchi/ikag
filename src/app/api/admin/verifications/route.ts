import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { providerProfiles, providerServices, users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, isNull } from "drizzle-orm";

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

    // Get all unverified providers
    const providers = await db
      .select({
        id: providerProfiles.id,
        userId: providerProfiles.userId,
        bio: providerProfiles.bio,
        isAvailable: providerProfiles.isAvailable,
        verifiedAt: providerProfiles.verifiedAt,
        createdAt: providerProfiles.createdAt,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(providerProfiles)
      .innerJoin(users, eq(providerProfiles.userId, users.id))
      .where(isNull(providerProfiles.verifiedAt));

    // Get services for each provider
    const providersWithServices = await Promise.all(
      providers.map(async (provider) => {
        const services = await db.query.providerServices.findMany({
          where: eq(providerServices.providerId, provider.id),
          with: {
            serviceType: true,
          },
        });
        return {
          ...provider,
          services,
        };
      })
    );

    return NextResponse.json(providersWithServices);
  } catch (error) {
    console.error("Failed to fetch verifications:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
