import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reviews, users, serviceRequests, providerProfiles } from "@/db/schema";
import { eq, and, desc, or } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// GET - Fetch all reviews for a provider
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: providerId } = await params;

    const reviewsList = await db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        comment: reviews.comment,
        providerResponse: reviews.providerResponse,
        providerRespondedAt: reviews.providerRespondedAt,
        createdAt: reviews.createdAt,
        updatedAt: reviews.updatedAt,
        userId: reviews.userId,
        reviewerName: users.name,
        reviewerImage: users.image,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .where(eq(reviews.providerId, providerId))
      .orderBy(desc(reviews.createdAt));

    return NextResponse.json(reviewsList);
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}

// POST - Create a new review
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: providerId } = await params;
    const body = await request.json();
    const { requestId, rating, comment } = body;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    // Check if user has a completed or cancelled service request with this provider
    const eligibleRequest = await db
      .select()
      .from(serviceRequests)
      .where(
        and(
          eq(serviceRequests.id, requestId),
          eq(serviceRequests.userId, session.user.id),
          eq(serviceRequests.providerId, providerId),
          or(
            eq(serviceRequests.status, "completed"),
            eq(serviceRequests.status, "cancelled")
          )
        )
      )
      .limit(1);

    if (eligibleRequest.length === 0) {
      return NextResponse.json(
        { error: "You can only review providers for completed or cancelled services" },
        { status: 403 }
      );
    }

    // Check if review already exists for this request
    const existingReview = await db
      .select()
      .from(reviews)
      .where(eq(reviews.requestId, requestId))
      .limit(1);

    if (existingReview.length > 0) {
      return NextResponse.json(
        { error: "You have already reviewed this service" },
        { status: 400 }
      );
    }

    // Create review
    const [newReview] = await db
      .insert(reviews)
      .values({
        requestId,
        userId: session.user.id,
        providerId,
        rating,
        comment,
      })
      .returning();

    // Update provider's average rating
    await updateProviderRating(providerId);

    return NextResponse.json(newReview, { status: 201 });
  } catch (error) {
    console.error("Error creating review:", error);
    return NextResponse.json(
      { error: "Failed to create review" },
      { status: 500 }
    );
  }
}

// Helper to update provider's average rating
async function updateProviderRating(providerId: string) {
  const result = await db
    .select({
      avgRating: reviews.rating,
    })
    .from(reviews)
    .where(eq(reviews.providerId, providerId));

  const totalReviews = result.length;
  const avgRating = totalReviews > 0
    ? result.reduce((sum, r) => sum + r.avgRating, 0) / totalReviews
    : 0;

  await db
    .update(providerProfiles)
    .set({
      averageRating: avgRating.toFixed(2),
      totalReviews,
    })
    .where(eq(providerProfiles.id, providerId));
}
