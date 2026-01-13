import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  decimal,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { serviceTypes } from "./services";
import { geography } from "@/lib/db/custom-types";

// Agency verification status enum
export const agencyStatusEnum = pgEnum("agency_status", [
  "pending",
  "verified",
  "suspended",
]);

// Agency member role enum
export const agencyMemberRoleEnum = pgEnum("agency_member_role", [
  "owner",
  "manager",
  "provider",
]);

// Agencies table
export const agencies = pgTable(
  "agencies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description"),
    logo: text("logo"),
    // Contact info
    email: text("email").notNull(),
    phone: text("phone"),
    website: text("website"),
    // Location
    location: geography("location"),
    latitude: decimal("latitude", { precision: 10, scale: 7 }),
    longitude: decimal("longitude", { precision: 10, scale: 7 }),
    address: text("address"),
    serviceRadius: integer("service_radius").default(10), // km
    // Status
    status: agencyStatusEnum("status").default("pending").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    // Owner/Admin
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Verification
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    verifiedBy: uuid("verified_by").references(() => users.id),
    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("agencies_owner_idx").on(table.ownerId),
    index("agencies_status_idx").on(table.status),
    index("agencies_location_idx").using("gist", table.location),
  ]
);

// Agency members (providers working for agencies)
// Many-to-many: providers can work for multiple agencies
export const agencyMembers = pgTable(
  "agency_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agencyId: uuid("agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    // For internal providers (platform users)
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    // External provider flag
    isExternal: boolean("is_external").default(false).notNull(),
    // External provider details (when isExternal = true)
    externalName: text("external_name"),
    externalEmail: text("external_email"),
    externalPhone: text("external_phone"),
    externalNotes: text("external_notes"),
    // Role within agency
    role: agencyMemberRoleEnum("role").default("provider").notNull(),
    // Status
    isActive: boolean("is_active").default(true).notNull(),
    // Timestamps
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("agency_members_agency_idx").on(table.agencyId),
    index("agency_members_user_idx").on(table.userId),
    index("agency_members_active_idx").on(table.agencyId, table.isActive),
  ]
);

// Agency member services (which services each member can provide)
export const agencyMemberServices = pgTable(
  "agency_member_services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agencyMemberId: uuid("agency_member_id")
      .notNull()
      .references(() => agencyMembers.id, { onDelete: "cascade" }),
    serviceTypeId: uuid("service_type_id")
      .notNull()
      .references(() => serviceTypes.id, { onDelete: "cascade" }),
    // Custom hourly rate for this member at this agency
    hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("agency_member_services_member_idx").on(table.agencyMemberId),
    index("agency_member_services_service_idx").on(table.serviceTypeId),
  ]
);

// Agency services (services offered by the agency)
export const agencyServices = pgTable(
  "agency_services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agencyId: uuid("agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    serviceTypeId: uuid("service_type_id")
      .notNull()
      .references(() => serviceTypes.id, { onDelete: "cascade" }),
    // Agency's rate for this service
    hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }),
    // Description specific to agency's offering
    description: text("description"),
    // Is this service currently available
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("agency_services_agency_idx").on(table.agencyId),
    index("agency_services_service_idx").on(table.serviceTypeId),
  ]
);

// Types
export type Agency = typeof agencies.$inferSelect;
export type NewAgency = typeof agencies.$inferInsert;
export type AgencyMember = typeof agencyMembers.$inferSelect;
export type NewAgencyMember = typeof agencyMembers.$inferInsert;
export type AgencyMemberService = typeof agencyMemberServices.$inferSelect;
export type NewAgencyMemberService = typeof agencyMemberServices.$inferInsert;
export type AgencyService = typeof agencyServices.$inferSelect;
export type NewAgencyService = typeof agencyServices.$inferInsert;
