import { db } from "@/lib/db";
import {
  providerProfiles,
  providerServices,
  users,
  serviceTypes,
  agencies,
  agencyServices,
} from "@/db/schema";
import { eq, and, isNotNull, sql, inArray } from "drizzle-orm";

interface FindProvidersNearbyOptions {
  latitude: number;
  longitude: number;
  radiusMeters?: number;
  serviceTypeId?: string;
  verifiedOnly?: boolean;
  availableOnly?: boolean;
  limit?: number;
}

export interface NearbyProvider {
  id: string;
  userId: string;
  name: string;
  image: string | null;
  bio: string | null;
  yearsOfExperience: number | null;
  isAvailable: boolean;
  averageRating: string | null;
  totalReviews: number | null;
  verifiedAt: Date | null;
  distance: number; // in meters
  services: Array<{
    id: string;
    serviceTypeId: string;
    name: string;
    hourlyRate: string | null;
  }>;
}

/**
 * Find providers within a radius using PostGIS ST_DWithin
 */
export async function findProvidersNearby(
  options: FindProvidersNearbyOptions
): Promise<NearbyProvider[]> {
  const {
    latitude,
    longitude,
    radiusMeters = 10000, // 10km default
    serviceTypeId,
    verifiedOnly = true,
    availableOnly = true,
    limit = 20,
  } = options;

  // Build conditions
  const conditions = [];

  if (availableOnly) {
    conditions.push(eq(providerProfiles.isAvailable, true));
  }

  if (verifiedOnly) {
    conditions.push(isNotNull(providerProfiles.verifiedAt));
  }

  // PostGIS spatial query
  conditions.push(
    sql`ST_DWithin(
      ${providerProfiles.location}::geography,
      ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
      ${radiusMeters}
    )`
  );

  // Query providers
  const providersQuery = await db
    .select({
      id: providerProfiles.id,
      userId: providerProfiles.userId,
      bio: providerProfiles.bio,
      yearsOfExperience: providerProfiles.yearsOfExperience,
      isAvailable: providerProfiles.isAvailable,
      averageRating: providerProfiles.averageRating,
      totalReviews: providerProfiles.totalReviews,
      verifiedAt: providerProfiles.verifiedAt,
      userName: users.name,
      userImage: users.image,
      distance: sql<number>`ST_Distance(
        ${providerProfiles.location}::geography,
        ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
      )`.as("distance"),
    })
    .from(providerProfiles)
    .innerJoin(users, eq(providerProfiles.userId, users.id))
    .where(and(...conditions))
    .orderBy(sql`distance`)
    .limit(limit);

  if (providersQuery.length === 0) {
    return [];
  }

  // Get provider IDs
  const providerIds = providersQuery.map((p) => p.id);

  // Get services for all providers
  let servicesQuery;
  if (serviceTypeId) {
    // Filter by specific service type
    servicesQuery = await db
      .select({
        providerId: providerServices.providerId,
        serviceId: providerServices.id,
        serviceTypeId: providerServices.serviceTypeId,
        serviceName: serviceTypes.name,
        hourlyRate: providerServices.hourlyRate,
      })
      .from(providerServices)
      .innerJoin(serviceTypes, eq(providerServices.serviceTypeId, serviceTypes.id))
      .where(
        and(
          inArray(providerServices.providerId, providerIds),
          eq(providerServices.serviceTypeId, serviceTypeId)
        )
      );

    // Filter out providers that don't offer this service
    const validProviderIds = new Set(servicesQuery.map((s) => s.providerId));
    providersQuery.splice(
      0,
      providersQuery.length,
      ...providersQuery.filter((p) => validProviderIds.has(p.id))
    );
  } else {
    // Get all services
    servicesQuery = await db
      .select({
        providerId: providerServices.providerId,
        serviceId: providerServices.id,
        serviceTypeId: providerServices.serviceTypeId,
        serviceName: serviceTypes.name,
        hourlyRate: providerServices.hourlyRate,
      })
      .from(providerServices)
      .innerJoin(serviceTypes, eq(providerServices.serviceTypeId, serviceTypes.id))
      .where(inArray(providerServices.providerId, providerIds));
  }

  // Group services by provider
  const servicesByProvider = new Map<
    string,
    Array<{ id: string; serviceTypeId: string; name: string; hourlyRate: string | null }>
  >();
  for (const service of servicesQuery) {
    const existing = servicesByProvider.get(service.providerId) || [];
    existing.push({
      id: service.serviceId,
      serviceTypeId: service.serviceTypeId,
      name: service.serviceName,
      hourlyRate: service.hourlyRate,
    });
    servicesByProvider.set(service.providerId, existing);
  }

  // Combine results
  return providersQuery.map((provider) => ({
    id: provider.id,
    userId: provider.userId,
    name: provider.userName,
    image: provider.userImage,
    bio: provider.bio,
    yearsOfExperience: provider.yearsOfExperience,
    isAvailable: provider.isAvailable,
    averageRating: provider.averageRating,
    totalReviews: provider.totalReviews,
    verifiedAt: provider.verifiedAt,
    distance: provider.distance,
    services: servicesByProvider.get(provider.id) || [],
  }));
}

/**
 * Get a single provider by ID with full details
 */
export async function getProviderById(providerId: string) {
  const result = await db
    .select({
      id: providerProfiles.id,
      userId: providerProfiles.userId,
      bio: providerProfiles.bio,
      yearsOfExperience: providerProfiles.yearsOfExperience,
      isAvailable: providerProfiles.isAvailable,
      averageRating: providerProfiles.averageRating,
      totalReviews: providerProfiles.totalReviews,
      verifiedAt: providerProfiles.verifiedAt,
      serviceRadius: providerProfiles.serviceRadius,
      address: providerProfiles.address,
      userName: users.name,
      userImage: users.image,
      userEmail: users.email,
    })
    .from(providerProfiles)
    .innerJoin(users, eq(providerProfiles.userId, users.id))
    .where(eq(providerProfiles.id, providerId))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  // Get services
  const services = await db
    .select({
      id: providerServices.id,
      name: serviceTypes.name,
      hourlyRate: providerServices.hourlyRate,
      description: providerServices.description,
    })
    .from(providerServices)
    .innerJoin(serviceTypes, eq(providerServices.serviceTypeId, serviceTypes.id))
    .where(eq(providerServices.providerId, providerId));

  const provider = result[0];

  return {
    id: provider.id,
    userId: provider.userId,
    name: provider.userName,
    email: provider.userEmail,
    image: provider.userImage,
    bio: provider.bio,
    yearsOfExperience: provider.yearsOfExperience,
    isAvailable: provider.isAvailable,
    averageRating: provider.averageRating,
    totalReviews: provider.totalReviews,
    verifiedAt: provider.verifiedAt,
    serviceRadius: provider.serviceRadius,
    address: provider.address,
    services,
  };
}

/**
 * Update provider availability
 */
export async function updateProviderAvailability(
  providerId: string,
  isAvailable: boolean
) {
  return await db
    .update(providerProfiles)
    .set({
      isAvailable,
      updatedAt: new Date(),
    })
    .where(eq(providerProfiles.id, providerId))
    .returning();
}

/**
 * Verify a provider (admin action)
 */
export async function verifyProvider(providerId: string, verifiedBy: string) {
  return await db
    .update(providerProfiles)
    .set({
      verifiedAt: new Date(),
      verifiedBy,
      updatedAt: new Date(),
    })
    .where(eq(providerProfiles.id, providerId))
    .returning();
}

/**
 * Revoke provider verification (admin action)
 */
export async function revokeProviderVerification(providerId: string) {
  return await db
    .update(providerProfiles)
    .set({
      verifiedAt: null,
      verifiedBy: null,
      updatedAt: new Date(),
    })
    .where(eq(providerProfiles.id, providerId))
    .returning();
}

// ============================================================================
// Agency Search Functions
// ============================================================================

export interface NearbyAgency {
  id: string;
  type: "agency";
  name: string;
  logo: string | null;
  description: string | null;
  isActive: boolean;
  verifiedAt: Date | null;
  distance: number;
  memberCount: number;
  services: Array<{
    id: string;
    serviceTypeId: string;
    name: string;
    hourlyRate: string | null;
  }>;
}

interface FindAgenciesNearbyOptions {
  latitude: number;
  longitude: number;
  radiusMeters?: number;
  serviceTypeId?: string;
  verifiedOnly?: boolean;
  limit?: number;
}

/**
 * Find agencies within a radius using PostGIS ST_DWithin
 */
export async function findAgenciesNearby(
  options: FindAgenciesNearbyOptions
): Promise<NearbyAgency[]> {
  const {
    latitude,
    longitude,
    radiusMeters = 10000,
    serviceTypeId,
    verifiedOnly = true,
    limit = 20,
  } = options;

  // Build conditions
  const conditions = [];

  conditions.push(eq(agencies.isActive, true));

  if (verifiedOnly) {
    conditions.push(isNotNull(agencies.verifiedAt));
  }

  // PostGIS spatial query
  conditions.push(
    sql`ST_DWithin(
      ${agencies.location}::geography,
      ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
      ${radiusMeters}
    )`
  );

  // Query agencies
  const agenciesQuery = await db
    .select({
      id: agencies.id,
      name: agencies.name,
      logo: agencies.logo,
      description: agencies.description,
      isActive: agencies.isActive,
      verifiedAt: agencies.verifiedAt,
      distance: sql<number>`ST_Distance(
        ${agencies.location}::geography,
        ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
      )`.as("distance"),
      memberCount: sql<number>`(
        SELECT COUNT(*) FROM agency_members 
        WHERE agency_members.agency_id = ${agencies.id} 
        AND agency_members.is_active = true
      )`.as("member_count"),
    })
    .from(agencies)
    .where(and(...conditions))
    .orderBy(sql`distance`)
    .limit(limit);

  if (agenciesQuery.length === 0) {
    return [];
  }

  // Get agency IDs
  const agencyIds = agenciesQuery.map((a) => a.id);

  // Get services for all agencies
  let servicesQuery;
  if (serviceTypeId) {
    servicesQuery = await db
      .select({
        agencyId: agencyServices.agencyId,
        serviceId: agencyServices.id,
        serviceTypeId: agencyServices.serviceTypeId,
        serviceName: serviceTypes.name,
        hourlyRate: agencyServices.hourlyRate,
      })
      .from(agencyServices)
      .innerJoin(serviceTypes, eq(agencyServices.serviceTypeId, serviceTypes.id))
      .where(
        and(
          inArray(agencyServices.agencyId, agencyIds),
          eq(agencyServices.serviceTypeId, serviceTypeId),
          eq(agencyServices.isActive, true)
        )
      );

    // Filter out agencies that don't offer this service
    const validAgencyIds = new Set(servicesQuery.map((s) => s.agencyId));
    agenciesQuery.splice(
      0,
      agenciesQuery.length,
      ...agenciesQuery.filter((a) => validAgencyIds.has(a.id))
    );
  } else {
    servicesQuery = await db
      .select({
        agencyId: agencyServices.agencyId,
        serviceId: agencyServices.id,
        serviceTypeId: agencyServices.serviceTypeId,
        serviceName: serviceTypes.name,
        hourlyRate: agencyServices.hourlyRate,
      })
      .from(agencyServices)
      .innerJoin(serviceTypes, eq(agencyServices.serviceTypeId, serviceTypes.id))
      .where(
        and(
          inArray(agencyServices.agencyId, agencyIds),
          eq(agencyServices.isActive, true)
        )
      );
  }

  // Group services by agency
  const servicesByAgency = new Map<
    string,
    Array<{ id: string; serviceTypeId: string; name: string; hourlyRate: string | null }>
  >();
  for (const service of servicesQuery) {
    const existing = servicesByAgency.get(service.agencyId) || [];
    existing.push({
      id: service.serviceId,
      serviceTypeId: service.serviceTypeId,
      name: service.serviceName,
      hourlyRate: service.hourlyRate,
    });
    servicesByAgency.set(service.agencyId, existing);
  }

  return agenciesQuery.map((agency) => ({
    id: agency.id,
    type: "agency" as const,
    name: agency.name,
    logo: agency.logo,
    description: agency.description,
    isActive: agency.isActive,
    verifiedAt: agency.verifiedAt,
    distance: agency.distance,
    memberCount: Number(agency.memberCount),
    services: servicesByAgency.get(agency.id) || [],
  }));
}

// ============================================================================
// Combined Search (Individuals + Agencies)
// ============================================================================

export type ProviderType = "individual" | "agency" | "all";

export interface CombinedSearchResult {
  id: string;
  type: "individual" | "agency";
  name: string;
  image: string | null;
  description: string | null;
  isAvailable: boolean;
  verifiedAt: Date | null;
  distance: number;
  memberCount?: number;
  averageRating?: string | null;
  services: Array<{
    id: string;
    serviceTypeId: string;
    name: string;
    hourlyRate: string | null;
  }>;
}

interface CombinedSearchOptions {
  latitude: number;
  longitude: number;
  radiusMeters?: number;
  serviceTypeId?: string;
  verifiedOnly?: boolean;
  availableOnly?: boolean;
  providerType?: ProviderType;
  limit?: number;
}

/**
 * Combined search for both individual providers and agencies
 */
export async function findProvidersAndAgencies(
  options: CombinedSearchOptions
): Promise<CombinedSearchResult[]> {
  const {
    providerType = "all",
    limit = 40,
    ...searchOptions
  } = options;

  const results: CombinedSearchResult[] = [];

  // Search for individual providers
  if (providerType === "all" || providerType === "individual") {
    const providers = await findProvidersNearby({
      ...searchOptions,
      limit: providerType === "all" ? Math.ceil(limit / 2) : limit,
    });

    results.push(
      ...providers.map((p) => ({
        id: p.id,
        type: "individual" as const,
        name: p.name,
        image: p.image,
        description: p.bio,
        isAvailable: p.isAvailable,
        verifiedAt: p.verifiedAt,
        distance: p.distance,
        averageRating: p.averageRating,
        services: p.services,
      }))
    );
  }

  // Search for agencies
  if (providerType === "all" || providerType === "agency") {
    const agencyResults = await findAgenciesNearby({
      ...searchOptions,
      limit: providerType === "all" ? Math.ceil(limit / 2) : limit,
    });

    results.push(
      ...agencyResults.map((a) => ({
        id: a.id,
        type: "agency" as const,
        name: a.name,
        image: a.logo,
        description: a.description,
        isAvailable: a.isActive,
        verifiedAt: a.verifiedAt,
        distance: a.distance,
        memberCount: a.memberCount,
        services: a.services,
      }))
    );
  }

  // Sort combined results by distance
  results.sort((a, b) => a.distance - b.distance);

  return results.slice(0, limit);
}
