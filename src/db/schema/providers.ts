import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  decimal,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { serviceTypes } from "./services";
import { geography } from "@/lib/db/custom-types";

// Provider profiles table
export const providerProfiles = pgTable(
  "provider_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    bio: text("bio"),
    yearsOfExperience: integer("years_of_experience").default(0),
    location: geography("location"),
    // Store lat/lng separately for easier access
    latitude: decimal("latitude", { precision: 10, scale: 7 }),
    longitude: decimal("longitude", { precision: 10, scale: 7 }),
    address: text("address"),
    serviceRadius: integer("service_radius").default(10), // in km
    isAvailable: boolean("is_available").default(false).notNull(),
    averageRating: decimal("average_rating", { precision: 3, scale: 2 }).default("0"),
    totalReviews: integer("total_reviews").default(0),
    // Verification
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    verifiedBy: uuid("verified_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    // GiST spatial index for location queries
    index("provider_profiles_location_idx").using("gist", table.location),
    // Partial index for verified providers
    index("provider_profiles_verified_idx")
      .on(table.verifiedAt)
      .where(sql`verified_at IS NOT NULL`),
    // Index for availability lookups
    index("provider_profiles_available_idx").on(table.isAvailable),
  ]
);

// Provider services - many-to-many relationship
export const providerServices = pgTable("provider_services", {
  id: uuid("id").primaryKey().defaultRandom(),
  providerId: uuid("provider_id")
    .notNull()
    .references(() => providerProfiles.id, { onDelete: "cascade" }),
  serviceTypeId: uuid("service_type_id")
    .notNull()
    .references(() => serviceTypes.id, { onDelete: "cascade" }),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Types
export type ProviderProfile = typeof providerProfiles.$inferSelect;
export type NewProviderProfile = typeof providerProfiles.$inferInsert;
export type ProviderService = typeof providerServices.$inferSelect;
export type NewProviderService = typeof providerServices.$inferInsert;
