import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { providerProfiles } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";

async function getSession() {
  return await auth.api.getSession({
    headers: await headers(),
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { approved } = body;

    if (approved) {
      // Approve the provider
      const [updated] = await db
        .update(providerProfiles)
        .set({
          verifiedAt: new Date(),
          verifiedBy: session.user.id,
          updatedAt: new Date(),
        })
        .where(eq(providerProfiles.id, id))
        .returning();

      if (!updated) {
        return NextResponse.json({ error: "Provider not found" }, { status: 404 });
      }

      return NextResponse.json({ success: true, verified: true });
    } else {
      // For rejection, we could delete the profile or mark it differently
      // For now, we'll just return success without marking as verified
      return NextResponse.json({ success: true, verified: false });
    }
  } catch (error) {
    console.error("Failed to process verification:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
