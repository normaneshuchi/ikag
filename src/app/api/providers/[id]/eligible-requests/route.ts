import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serviceRequests, reviews } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// GET - Check if current user has eligible requests to review this provider
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ eligibleRequests: [] });
    }

    const { id: providerId } = await params;

    // Get all reviewed request IDs for this user and provider
    const reviewedRequests = await db
      .select({ requestId: reviews.requestId })
      .from(reviews)
      .where(eq(reviews.userId, session.user.id));

    const reviewedIds = reviewedRequests.map(r => r.requestId);

    // Build query for eligible requests
    const allEligible = await db
      .select({
        id: serviceRequests.id,
        description: serviceRequests.description,
        status: serviceRequests.status,
        completedAt: serviceRequests.completedAt,
        createdAt: serviceRequests.createdAt,
      })
      .from(serviceRequests)
      .where(
        and(
          eq(serviceRequests.userId, session.user.id),
          eq(serviceRequests.providerId, providerId),
          or(
            eq(serviceRequests.status, "completed"),
            eq(serviceRequests.status, "cancelled")
          )
        )
      );

    // Filter out already reviewed requests
    const eligible = reviewedIds.length > 0 
      ? allEligible.filter(req => !reviewedIds.includes(req.id))
      : allEligible;

    return NextResponse.json({ eligibleRequests: eligible });
  } catch (error) {
    console.error("Error checking eligible requests:", error);
    return NextResponse.json(
      { error: "Failed to check eligible requests" },
      { status: 500 }
    );
  }
}
