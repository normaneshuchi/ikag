import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import {
  agencies,
  agencyMembers,
  agencyServices,
} from "@/db/schema";
import { eq, and, sql, ilike, or } from "drizzle-orm";
import { createAgencySchema } from "@/lib/schemas/agency.schema";

// GET - List agencies (with optional search/filters)
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const serviceTypeId = searchParams.get("serviceTypeId");
    const status = searchParams.get("status");
    const mine = searchParams.get("mine") === "true";
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const radius = searchParams.get("radius");

    // Build base conditions
    const conditions = [];

    // Filter by owner (my agencies)
    if (mine) {
      conditions.push(eq(agencies.ownerId, session.user.id));
    }

    // Search by name
    if (search) {
      conditions.push(
        or(
          ilike(agencies.name, `%${search}%`),
          ilike(agencies.description, `%${search}%`)
        )
      );
    }

    // Filter by status
    if (status) {
      conditions.push(eq(agencies.status, status as "pending" | "verified" | "suspended"));
    }

    // Location-based filtering
    if (lat && lng && radius) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      const radiusMeters = parseFloat(radius);

      if (!isNaN(latitude) && !isNaN(longitude) && !isNaN(radiusMeters)) {
        conditions.push(
          sql`ST_DWithin(
            ${agencies.location}::geography,
            ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
            ${radiusMeters}
          )`
        );
      }
    }

    // Build and execute query
    let results;
    if (serviceTypeId) {
      // Join with agency_services when filtering by service type
      results = await db
        .select({
          id: agencies.id,
          name: agencies.name,
          description: agencies.description,
          logo: agencies.logo,
          phone: agencies.phone,
          email: agencies.email,
          website: agencies.website,
          address: agencies.address,
          status: agencies.status,
          verifiedAt: agencies.verifiedAt,
          ownerId: agencies.ownerId,
          createdAt: agencies.createdAt,
        })
        .from(agencies)
        .innerJoin(
          agencyServices,
          and(
            eq(agencyServices.agencyId, agencies.id),
            eq(agencyServices.serviceTypeId, serviceTypeId)
          )
        )
        .where(conditions.length > 0 ? and(...conditions) : undefined);
    } else {
      results = await db
        .select({
          id: agencies.id,
          name: agencies.name,
          description: agencies.description,
          logo: agencies.logo,
          phone: agencies.phone,
          email: agencies.email,
          website: agencies.website,
          address: agencies.address,
          status: agencies.status,
          verifiedAt: agencies.verifiedAt,
          ownerId: agencies.ownerId,
          createdAt: agencies.createdAt,
        })
        .from(agencies)
        .where(conditions.length > 0 ? and(...conditions) : undefined);
    }

    if (results.length === 0) {
      return NextResponse.json([]);
    }

    // Get member and service counts for each agency
    const agencyIds = results.map((a) => a.id);

    const memberCounts = await db
      .select({
        agencyId: agencyMembers.agencyId,
        count: sql<number>`count(*)::int`,
      })
      .from(agencyMembers)
      .where(sql`${agencyMembers.agencyId} = ANY(${agencyIds})`)
      .groupBy(agencyMembers.agencyId);

    const serviceCounts = await db
      .select({
        agencyId: agencyServices.agencyId,
        count: sql<number>`count(*)::int`,
      })
      .from(agencyServices)
      .where(sql`${agencyServices.agencyId} = ANY(${agencyIds})`)
      .groupBy(agencyServices.agencyId);

    const memberCountMap = new Map(memberCounts.map((m) => [m.agencyId, m.count]));
    const serviceCountMap = new Map(serviceCounts.map((s) => [s.agencyId, s.count]));

    const enrichedResults = results.map((agency) => ({
      ...agency,
      isVerified: !!agency.verifiedAt,
      memberCount: memberCountMap.get(agency.id) || 0,
      serviceCount: serviceCountMap.get(agency.id) || 0,
    }));

    return NextResponse.json(enrichedResults);
  } catch (error) {
    console.error("Failed to fetch agencies:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create new agency
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = createAgencySchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { name, description, logo, phone, email, website, latitude, longitude, address } = result.data;

    // Create agency - email is required
    const agencyEmail = email || session.user.email;
    if (!agencyEmail) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const [agency] = await db
      .insert(agencies)
      .values({
        name,
        description,
        logo,
        phone,
        email: agencyEmail,
        website,
        latitude: latitude?.toString(),
        longitude: longitude?.toString(),
        address,
        location: latitude && longitude
          ? sql`ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)`
          : null,
        ownerId: session.user.id,
        status: "pending",
      })
      .returning();

    // Add owner as a member with 'owner' role
    await db.insert(agencyMembers).values({
      agencyId: agency.id,
      userId: session.user.id,
      isExternal: false,
      role: "owner",
    });

    return NextResponse.json(agency, { status: 201 });
  } catch (error) {
    console.error("Failed to create agency:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
