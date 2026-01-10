import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reviews, providerProfiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// PUT - Update review (user) or add response (provider)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: reviewId } = await params;
    const body = await request.json();

    // Get the review
    const [review] = await db
      .select()
      .from(reviews)
      .where(eq(reviews.id, reviewId))
      .limit(1);

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    // Check if user is the reviewer (editing review)
    if (body.rating !== undefined || body.comment !== undefined) {
      if (review.userId !== session.user.id) {
        return NextResponse.json(
          { error: "You can only edit your own reviews" },
          { status: 403 }
        );
      }

      // Check if within 7-day edit window
      const daysSinceCreation = (Date.now() - new Date(review.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreation > 7) {
        return NextResponse.json(
          { error: "Reviews can only be edited within 7 days of creation" },
          { status: 403 }
        );
      }

      // Validate rating if provided
      if (body.rating && (body.rating < 1 || body.rating > 5)) {
        return NextResponse.json(
          { error: "Rating must be between 1 and 5" },
          { status: 400 }
        );
      }

      const [updated] = await db
        .update(reviews)
        .set({
          rating: body.rating ?? review.rating,
          comment: body.comment ?? review.comment,
          updatedAt: new Date(),
        })
        .where(eq(reviews.id, reviewId))
        .returning();

      // Update provider's average rating if rating changed
      if (body.rating && body.rating !== review.rating) {
        await updateProviderRating(review.providerId);
      }

      return NextResponse.json(updated);
    }

    // Check if user is the provider (adding response)
    if (body.providerResponse !== undefined) {
      const providerProfile = await db
        .select()
        .from(providerProfiles)
        .where(
          and(
            eq(providerProfiles.id, review.providerId),
            eq(providerProfiles.userId, session.user.id)
          )
        )
        .limit(1);

      if (providerProfile.length === 0) {
        return NextResponse.json(
          { error: "Only the provider can respond to reviews" },
          { status: 403 }
        );
      }

      const [updated] = await db
        .update(reviews)
        .set({
          providerResponse: body.providerResponse,
          providerRespondedAt: new Date(),
        })
        .where(eq(reviews.id, reviewId))
        .returning();

      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "No valid update provided" }, { status: 400 });
  } catch (error) {
    console.error("Error updating review:", error);
    return NextResponse.json(
      { error: "Failed to update review" },
      { status: 500 }
    );
  }
}

async function updateProviderRating(providerId: string) {
  const result = await db
    .select({ avgRating: reviews.rating })
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
