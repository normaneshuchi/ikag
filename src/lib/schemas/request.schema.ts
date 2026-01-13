import { z } from "zod";

// Create service request schema
export const createRequestSchema = z.object({
  serviceTypeId: z.string().uuid("Invalid service type ID"),
  providerId: z.string().uuid("Invalid provider ID").optional(),
  description: z.string().min(10, "Description must be at least 10 characters"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
  // For admin: create request on behalf of a user
  userId: z.string().uuid("Invalid user ID").optional(),
  // For provider: create self-service request
  isSelfService: z.boolean().optional(),
});

export type CreateRequestInput = z.infer<typeof createRequestSchema>;

// Update request status schema
export const updateRequestStatusSchema = z.object({
  status: z.enum([
    "pending",
    "matched",
    "accepted",
    "in_progress",
    "completed",
    "cancelled",
  ]),
});

export type UpdateRequestStatusInput = z.infer<typeof updateRequestStatusSchema>;

// Accept request schema (provider accepts a request)
export const acceptRequestSchema = z.object({
  requestId: z.string().uuid("Invalid request ID"),
});

export type AcceptRequestInput = z.infer<typeof acceptRequestSchema>;
