import { z } from "zod";

// Create agency schema
export const createAgencySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  logo: z.string().url("Invalid logo URL").optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional(),
  website: z.string().url("Invalid website URL").optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  address: z.string().optional(),
});

// Update agency schema
export const updateAgencySchema = createAgencySchema.partial();

// Add member schema
export const addAgencyMemberSchema = z.object({
  // Either providerId (internal) OR external member details
  providerId: z.string().uuid("Invalid provider ID").optional(),
  isExternal: z.boolean().default(false),
  externalName: z.string().optional(),
  externalEmail: z.string().email("Invalid email").optional(),
  externalPhone: z.string().optional(),
  externalNotes: z.string().optional(),
  role: z.enum(["owner", "manager", "provider"]).default("provider"),
}).refine(
  (data) => {
    // Either providerId OR (isExternal with externalName)
    if (data.isExternal) {
      return !!data.externalName;
    }
    return !!data.providerId;
  },
  {
    message: "Either providerId or external member details required",
  }
);

// Add member service schema
export const addMemberServiceSchema = z.object({
  serviceTypeId: z.string().uuid("Invalid service type ID"),
  hourlyRate: z.number().positive("Hourly rate must be positive").optional(),
});

// Accept request schema (for agencies)
export const acceptRequestSchema = z.object({
  requestId: z.string().uuid("Invalid request ID"),
  agencyMemberId: z.string().uuid("Invalid member ID"),
  estimatedDuration: z.number().int().positive("Duration must be positive"), // minutes
  scheduledAt: z.string().datetime("Invalid scheduled date"),
});

export type CreateAgencyInput = z.infer<typeof createAgencySchema>;
export type UpdateAgencyInput = z.infer<typeof updateAgencySchema>;
export type AddAgencyMemberInput = z.infer<typeof addAgencyMemberSchema>;
export type AddMemberServiceInput = z.infer<typeof addMemberServiceSchema>;
export type AcceptRequestInput = z.infer<typeof acceptRequestSchema>;
