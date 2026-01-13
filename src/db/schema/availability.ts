import {
  pgTable,
  uuid,
  timestamp,
  integer,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { agencyMembers } from "./agencies";
import { serviceRequests } from "./requests";
import { serviceTypes } from "./services";

// Booking status enum
export const bookingStatusEnum = pgEnum("booking_status", [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
]);

// Provider/Member bookings - tracks time allocations to prevent overbooking
export const providerBookings = pgTable(
  "provider_bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // The agency member (provider) assigned to this booking
    agencyMemberId: uuid("agency_member_id")
      .notNull()
      .references(() => agencyMembers.id, { onDelete: "cascade" }),
    // The service request this booking is for
    requestId: uuid("request_id")
      .notNull()
      .references(() => serviceRequests.id, { onDelete: "cascade" }),
    // Service type for quick filtering
    serviceTypeId: uuid("service_type_id")
      .notNull()
      .references(() => serviceTypes.id, { onDelete: "cascade" }),
    // Scheduled time window
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    endTime: timestamp("end_time", { withTimezone: true }).notNull(),
    // Duration in minutes (provided by agency/provider on acceptance)
    estimatedDuration: integer("estimated_duration").notNull(), // minutes
    // Status
    status: bookingStatusEnum("status").default("scheduled").notNull(),
    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("provider_bookings_member_idx").on(table.agencyMemberId),
    index("provider_bookings_request_idx").on(table.requestId),
    index("provider_bookings_service_idx").on(table.serviceTypeId),
    index("provider_bookings_time_idx").on(table.agencyMemberId, table.startTime, table.endTime),
    index("provider_bookings_status_idx").on(table.status),
  ]
);

// Types
export type ProviderBooking = typeof providerBookings.$inferSelect;
export type NewProviderBooking = typeof providerBookings.$inferInsert;
