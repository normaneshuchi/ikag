import { z } from "zod";

// Location schema
export const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().optional(),
});

export type LocationInput = z.infer<typeof locationSchema>;

// Provider profile schema
export const providerProfileSchema = z.object({
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
  yearsOfExperience: z.number().min(0).max(50).default(0),
  location: locationSchema.optional(),
  serviceRadius: z.number().min(1).max(100).default(10), // km
  isAvailable: z.boolean().default(false),
  serviceIds: z.array(z.string().uuid()).optional(),
});

export type ProviderProfileInput = z.infer<typeof providerProfileSchema>;

// Update provider profile schema
export const updateProviderProfileSchema = providerProfileSchema.partial();

export type UpdateProviderProfileInput = z.infer<typeof updateProviderProfileSchema>;

// Provider service (service they offer)
export const providerServiceSchema = z.object({
  serviceTypeId: z.string().uuid("Invalid service type ID"),
  hourlyRate: z.number().min(0).optional(),
  description: z.string().max(200).optional(),
});

export type ProviderServiceInput = z.infer<typeof providerServiceSchema>;

// Availability toggle schema
export const toggleAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
});

export type ToggleAvailabilityInput = z.infer<typeof toggleAvailabilitySchema>;

// Provider search query schema
export const searchProvidersSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  serviceTypeId: z.string().uuid().optional(),
  radiusKm: z.number().min(1).max(100).default(10),
  verifiedOnly: z.boolean().default(true),
});

export type SearchProvidersInput = z.infer<typeof searchProvidersSchema>;
