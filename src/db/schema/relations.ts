import { relations } from "drizzle-orm";
import { users, sessions, accounts, verifications } from "./users";
import { serviceTypes } from "./services";
import { providerProfiles, providerServices } from "./providers";
import { serviceRequests } from "./requests";
import { reviews } from "./reviews";
import { agencies, agencyMembers, agencyMemberServices, agencyServices } from "./agencies";
import { providerBookings } from "./availability";

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
  ownedAgencies: many(agencies),
  agencyMemberships: many(agencyMembers),
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
  agencyServices: many(agencyServices),
  agencyMemberServices: many(agencyMemberServices),
  providerBookings: many(providerBookings),
}));

// Service requests relations
export const serviceRequestsRelations = relations(serviceRequests, ({ one, many }) => ({
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
  agency: one(agencies, {
    fields: [serviceRequests.agencyId],
    references: [agencies.id],
  }),
  agencyMember: one(agencyMembers, {
    fields: [serviceRequests.agencyMemberId],
    references: [agencyMembers.id],
  }),
  review: one(reviews),
  bookings: many(providerBookings),
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

// Agency relations
export const agenciesRelations = relations(agencies, ({ one, many }) => ({
  owner: one(users, {
    fields: [agencies.ownerId],
    references: [users.id],
  }),
  verifier: one(users, {
    fields: [agencies.verifiedBy],
    references: [users.id],
  }),
  members: many(agencyMembers),
  services: many(agencyServices),
  serviceRequests: many(serviceRequests),
}));

// Agency members relations
export const agencyMembersRelations = relations(agencyMembers, ({ one, many }) => ({
  agency: one(agencies, {
    fields: [agencyMembers.agencyId],
    references: [agencies.id],
  }),
  // For internal members (platform users)
  user: one(users, {
    fields: [agencyMembers.userId],
    references: [users.id],
  }),
  services: many(agencyMemberServices),
  bookings: many(providerBookings),
  assignedRequests: many(serviceRequests),
}));

// Agency member services relations
export const agencyMemberServicesRelations = relations(agencyMemberServices, ({ one }) => ({
  agencyMember: one(agencyMembers, {
    fields: [agencyMemberServices.agencyMemberId],
    references: [agencyMembers.id],
  }),
  serviceType: one(serviceTypes, {
    fields: [agencyMemberServices.serviceTypeId],
    references: [serviceTypes.id],
  }),
}));

// Agency services relations
export const agencyServicesRelations = relations(agencyServices, ({ one }) => ({
  agency: one(agencies, {
    fields: [agencyServices.agencyId],
    references: [agencies.id],
  }),
  serviceType: one(serviceTypes, {
    fields: [agencyServices.serviceTypeId],
    references: [serviceTypes.id],
  }),
}));

// Provider bookings relations
export const providerBookingsRelations = relations(providerBookings, ({ one }) => ({
  agencyMember: one(agencyMembers, {
    fields: [providerBookings.agencyMemberId],
    references: [agencyMembers.id],
  }),
  request: one(serviceRequests, {
    fields: [providerBookings.requestId],
    references: [serviceRequests.id],
  }),
  serviceType: one(serviceTypes, {
    fields: [providerBookings.serviceTypeId],
    references: [serviceTypes.id],
  }),
}));
