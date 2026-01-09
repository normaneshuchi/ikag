"use client";

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient;

// Type helper for user with role
export type UserRole = "admin" | "provider" | "user";

export interface UserWithRole {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  role?: UserRole;
  createdAt: Date;
  updatedAt: Date;
  emailVerified: boolean;
}

export function getUserRole(user: unknown): UserRole {
  const u = user as UserWithRole | undefined;
  return u?.role ?? "user";
}
