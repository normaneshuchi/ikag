import { relations } from "drizzle-orm";
import { users, sessions, accounts, verifications } from "./users";
import { serviceTypes } from "./services";
import { providerProfiles, providerServices } from "./providers";
import { serviceRequests } from "./requests";
import { reviews } from "./reviews";

// User relations
export const usersRelations = relations(users, ({ many, one }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  verifications: many(verifications),
  providerProfile: one(providerProfiles, {
    fields: [users.id],
    references: [providerProfiles.userId],
  }),
  serviceRequests: many(serviceRequests),
  reviewsGiven: many(reviews),
}));

// Session relations
export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

// Account relations
export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

// Provider profile relations
export const providerProfilesRelations = relations(providerProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [providerProfiles.userId],
    references: [users.id],
  }),
  verifier: one(users, {
    fields: [providerProfiles.verifiedBy],
    references: [users.id],
  }),
  services: many(providerServices),
  serviceRequests: many(serviceRequests),
  reviews: many(reviews),
}));

// Provider services relations
export const providerServicesRelations = relations(providerServices, ({ one }) => ({
  provider: one(providerProfiles, {
    fields: [providerServices.providerId],
    references: [providerProfiles.id],
  }),
  serviceType: one(serviceTypes, {
    fields: [providerServices.serviceTypeId],
    references: [serviceTypes.id],
  }),
}));

// Service types relations
export const serviceTypesRelations = relations(serviceTypes, ({ many }) => ({
  providerServices: many(providerServices),
  serviceRequests: many(serviceRequests),
}));

// Service requests relations
export const serviceRequestsRelations = relations(serviceRequests, ({ one }) => ({
  user: one(users, {
    fields: [serviceRequests.userId],
    references: [users.id],
  }),
  serviceType: one(serviceTypes, {
    fields: [serviceRequests.serviceTypeId],
    references: [serviceTypes.id],
  }),
  provider: one(providerProfiles, {
    fields: [serviceRequests.providerId],
    references: [providerProfiles.id],
  }),
  review: one(reviews),
}));

// Reviews relations
export const reviewsRelations = relations(reviews, ({ one }) => ({
  request: one(serviceRequests, {
    fields: [reviews.requestId],
    references: [serviceRequests.id],
  }),
  reviewer: one(users, {
    fields: [reviews.userId],
    references: [users.id],
  }),
  provider: one(providerProfiles, {
    fields: [reviews.providerId],
    references: [providerProfiles.id],
  }),
}));
