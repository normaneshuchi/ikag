import "better-auth";
import "better-auth/react";

declare module "better-auth" {
  interface User {
    role: "admin" | "provider" | "user";
  }
}

declare module "better-auth/react" {
  interface User {
    role: "admin" | "provider" | "user";
  }
}
