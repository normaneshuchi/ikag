import { NextRequest, NextResponse } from "next/server";
import { findProvidersNearby } from "@/lib/db/queries/providers";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const radius = searchParams.get("radius");
    const serviceTypeId = searchParams.get("serviceTypeId");

    if (!lat || !lng) {
      return NextResponse.json({ error: "Location required" }, { status: 400 });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radiusMeters = radius ? parseFloat(radius) : 10000;

    if (isNaN(latitude) || isNaN(longitude) || isNaN(radiusMeters)) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const providers = await findProvidersNearby({
      latitude,
      longitude,
      radiusMeters,
      serviceTypeId: serviceTypeId || undefined,
    });

    return NextResponse.json(providers);
  } catch (error) {
    console.error("Failed to fetch providers:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
