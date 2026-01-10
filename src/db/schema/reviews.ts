import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { providerProfiles } from "./providers";
import { serviceRequests } from "./requests";

// Reviews table
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id")
      .notNull()
      .unique()
      .references(() => serviceRequests.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providerProfiles.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    comment: text("comment"),
    // Provider can respond to reviews
    providerResponse: text("provider_response"),
    providerRespondedAt: timestamp("provider_responded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("reviews_provider_idx").on(table.providerId),
    index("reviews_user_idx").on(table.userId),
    // Ensure rating is between 1 and 5
    check("rating_range", sql`${table.rating} >= 1 AND ${table.rating} <= 5`),
  ]
);

// Types
export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
