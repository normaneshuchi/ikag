import {
  pgTable,
  uuid,
  text,
  timestamp,
  decimal,
  pgEnum,
  index,
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
    providerId: uuid("provider_id").references(() => providerProfiles.id),
    status: requestStatusEnum("status").default("pending").notNull(),
    description: text("description").notNull(),
    location: geography("location"),
    latitude: decimal("latitude", { precision: 10, scale: 7 }),
    longitude: decimal("longitude", { precision: 10, scale: 7 }),
    address: text("address"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("service_requests_user_idx").on(table.userId),
    index("service_requests_provider_idx").on(table.providerId),
    index("service_requests_status_idx").on(table.status),
    index("service_requests_location_idx").using("gist", table.location),
  ]
);

// Types
export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type NewServiceRequest = typeof serviceRequests.$inferInsert;
