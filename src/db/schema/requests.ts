import {
  pgTable,
  uuid,
  text,
  timestamp,
  decimal,
  pgEnum,
  index,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { serviceTypes } from "./services";
import { providerProfiles } from "./providers";
import { geography } from "@/lib/db/custom-types";

// Request status enum
export const requestStatusEnum = pgEnum("request_status", [
  "pending",
  "matched",
  "accepted",
  "in_progress",
  "completed",
  "cancelled",
]);

// Service requests table
export const serviceRequests = pgTable(
  "service_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    serviceTypeId: uuid("service_type_id")
      .notNull()
      .references(() => serviceTypes.id),
    // Individual provider (for non-agency requests)
    providerId: uuid("provider_id").references(() => providerProfiles.id),
    // Agency handling the request (optional)
    agencyId: uuid("agency_id"),
    // Specific agency member assigned (optional)
    agencyMemberId: uuid("agency_member_id"),
    // Whether this is a self-service request (provider created for themselves)
    isSelfService: boolean("is_self_service").default(false).notNull(),
    status: requestStatusEnum("status").default("pending").notNull(),
    description: text("description").notNull(),
    location: geography("location"),
    latitude: decimal("latitude", { precision: 10, scale: 7 }),
    longitude: decimal("longitude", { precision: 10, scale: 7 }),
    address: text("address"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    // Estimated duration in minutes (provided by provider/agency on acceptance)
    estimatedDuration: integer("estimated_duration"),
    // Calculated end time based on scheduledAt + estimatedDuration
    estimatedEndTime: timestamp("estimated_end_time", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("service_requests_user_idx").on(table.userId),
    index("service_requests_provider_idx").on(table.providerId),
    index("service_requests_agency_idx").on(table.agencyId),
    index("service_requests_agency_member_idx").on(table.agencyMemberId),
    index("service_requests_status_idx").on(table.status),
    index("service_requests_location_idx").using("gist", table.location),
    index("service_requests_scheduled_idx").on(table.scheduledAt),
  ]
);

// Types
export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type NewServiceRequest = typeof serviceRequests.$inferInsert;
