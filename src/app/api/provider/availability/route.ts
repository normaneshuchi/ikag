import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { providerProfiles } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { broadcastProviderUpdate } from "@/app/api/providers/stream/route";

async function getSession() {
  return await auth.api.getSession({
    headers: await headers(),
  });
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await db.query.providerProfiles.findFirst({
      where: eq(providerProfiles.userId, session.user.id),
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const body = await request.json();
    const { isAvailable } = body;

    const [updated] = await db
      .update(providerProfiles)
      .set({
        isAvailable: !!isAvailable,
        updatedAt: new Date(),
      })
      .where(eq(providerProfiles.id, profile.id))
      .returning();

    // Broadcast SSE update
    broadcastProviderUpdate({
      type: "availability_change",
      providerId: profile.id,
      payload: { isAvailable: updated.isAvailable },
    });

    return NextResponse.json({ success: true, isAvailable: updated.isAvailable });
  } catch (error) {
    console.error("Failed to update availability:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
