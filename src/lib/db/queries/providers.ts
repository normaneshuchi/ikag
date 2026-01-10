import { db } from "@/lib/db";
import {
  providerProfiles,
  providerServices,
  users,
  serviceTypes,
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
