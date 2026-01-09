import { z } from "zod";

// Service type schema for admin CRUD
export const serviceTypeSchema = z.object({
  name: z.string().min(2, "Name must have at least 2 characters"),
  description: z.string().optional(),
  icon: z.string().optional(), // Tabler icon name
  isActive: z.boolean().default(true),
});

export type ServiceTypeInput = z.infer<typeof serviceTypeSchema>;

// Update service type schema
export const updateServiceTypeSchema = serviceTypeSchema.partial();

export type UpdateServiceTypeInput = z.infer<typeof updateServiceTypeSchema>;
