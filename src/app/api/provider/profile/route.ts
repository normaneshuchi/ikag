import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { providerProfiles, providerServices } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, sql } from "drizzle-orm";

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

    const profile = await db.query.providerProfiles.findFirst({
      where: eq(providerProfiles.userId, session.user.id),
      with: {
        services: {
          with: {
            serviceType: true,
          },
        },
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Extract coordinates from geography type
    const coordResult = await db.execute(sql`
      SELECT 
        ST_X(location::geometry) as longitude,
        ST_Y(location::geometry) as latitude
      FROM provider_profiles
      WHERE id = ${profile.id}
    `);

    const coords = coordResult.rows[0] as { latitude: number; longitude: number } | undefined;

    return NextResponse.json({
      ...profile,
      latitude: coords?.latitude || null,
      longitude: coords?.longitude || null,
      serviceIds: profile.services.map((s: { serviceTypeId: string }) => s.serviceTypeId),
    });
  } catch (error) {
    console.error("Failed to fetch profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.user || session.user.role !== "provider") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { bio, serviceIds, latitude, longitude } = body;

    // Check if profile already exists
    const existing = await db.query.providerProfiles.findFirst({
      where: eq(providerProfiles.userId, session.user.id),
    });

    if (existing) {
      return NextResponse.json({ error: "Profile already exists" }, { status: 400 });
    }

    // Create profile with PostGIS point
    const locationSql = latitude && longitude
      ? sql`ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography`
      : sql`NULL`;

    const result = await db.execute(sql`
      INSERT INTO provider_profiles (user_id, bio, location, is_available)
      VALUES (${session.user.id}, ${bio || null}, ${locationSql}, false)
      RETURNING id
    `);

    const newProfile = result.rows[0] as { id: string };

    // Add services
    if (serviceIds && serviceIds.length > 0) {
      for (const serviceTypeId of serviceIds) {
        await db.insert(providerServices).values({
          providerId: newProfile.id,
          serviceTypeId,
        });
      }
    }

    return NextResponse.json({ id: newProfile.id }, { status: 201 });
  } catch (error) {
    console.error("Failed to create profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
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
    const { bio, serviceIds, latitude, longitude } = body;

    // Update profile with PostGIS point
    if (latitude && longitude) {
      await db.execute(sql`
        UPDATE provider_profiles
        SET 
          bio = ${bio || null},
          location = ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
          updated_at = NOW()
        WHERE id = ${profile.id}
      `);
    } else {
      await db
        .update(providerProfiles)
        .set({
          bio: bio || null,
          updatedAt: new Date(),
        })
        .where(eq(providerProfiles.id, profile.id));
    }

    // Update services - delete existing and re-add
    await db.delete(providerServices).where(eq(providerServices.providerId, profile.id));

    if (serviceIds && serviceIds.length > 0) {
      for (const serviceTypeId of serviceIds) {
        await db.insert(providerServices).values({
          providerId: profile.id,
          serviceTypeId,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
